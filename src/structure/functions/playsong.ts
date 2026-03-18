import { EmbedBuilder, ChatInputCommandInteraction, ModalSubmitInteraction, ButtonInteraction, AnySelectMenuInteraction, GuildMember } from "discord.js"
import { KazagumoPlayer } from "kazagumo";
import { CustomClient, editReply, msToTimestamp } from "../../structure/index.js"

type ValidInteraction = ChatInputCommandInteraction |
    ModalSubmitInteraction |
    ButtonInteraction |
    AnySelectMenuInteraction

export async function playSong(interaction: ValidInteraction, client: CustomClient, player: KazagumoPlayer, query: string) {

    try {
        // Ensure player is connected
        //console.log(`Player state before search: ${player.state}`);
        if (player.state !== 1) {
            try {
                player.connect();
            } catch (error: any) {
                if (error.message.includes("already connected")) {
                    //console.log("Player is already connected, continuing...");
                } else {
                    throw error;
                }
            }
        }

        const result = await player.search(query, { requester: interaction.user });
        const link = `https://www.google.com/search?q=${encodeURIComponent(query)}`

        if (!result.tracks.length) {
            if (!player.queue.current) {
                if(player.state == 1) player.disconnect();
                player.destroy();
            }
            return editReply(interaction, "❌", "No result found");
        }

        if (result.tracks.length == 0) {
            if (!player.queue.current) {
                if(player.state == 1) player.disconnect();
                player.destroy();
            }
            editReply(interaction, "❌", "No result found");
        } else if (result.type === "PLAYLIST") {
            const playlist = result.tracks;
            if (playlist) {
                player.queue.add(result.tracks);
                if (!player.playing && !player.paused) {
                    await player.play();
                }

                interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor(client.color)
                        .setAuthor({ name: "ADDED TO QUEUE", iconURL: interaction.user.displayAvatarURL() })
                        .setDescription(`**${result.playlistName}** - ${result.tracks.length} tracks\n\nAdded by: ${interaction.user}`)]
                });
            }
        } else if (result.type === "TRACK" || result.type === "SEARCH") {
            const track = result.tracks[0];
            player.queue.add(track);

            if (!player.playing && !player.paused) {
                await player.play();
            }

            interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(client.color)
                    .setAuthor({ name: "ADDED TO QUEUE", iconURL: interaction.user.displayAvatarURL() })
                    .setDescription(`[\`\`${track.title}\`\`](${link})\n\n**Added by: ${interaction.user} | Duration: **\`\`❯ ${msToTimestamp(track.length || 0)}\`\``)
                ]
            });
        }

        else {
            if (!player.queue.current) {
                if(player.state == 1) player.disconnect();
                player.destroy();
            }
            editReply(interaction, "❌", "No result found");
        }

    } catch (error) {
        console.error(error);
        editReply(interaction, "❌", `Something went wrong! Please report to us using \`/report\`.`);
    }
}
