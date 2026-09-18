import { EmbedBuilder, ChatInputCommandInteraction, ModalSubmitInteraction, ButtonInteraction, AnySelectMenuInteraction, GuildMember } from "discord.js"
import { KazagumoPlayer } from "kazagumo";
import { Api } from "@top-gg/sdk";
import dailyDB from "../../schemas/dailyplays.js";
import { CustomClient, editReply, getDailyPlaysDoc, msToTimestamp } from "../../structure/index.js"

type ValidInteraction = ChatInputCommandInteraction |
    ModalSubmitInteraction |
    ButtonInteraction |
    AnySelectMenuInteraction

// Single writer for the Voted flag - the same { User, Date } filter + $set
// shape was copy-pasted 4x. DB failures are swallowed so a Mongo hiccup never
// masquerades as a Top.gg verdict; the in-memory doc still drives this request.
async function setVoted(userId: string, date: string, voted: boolean | null): Promise<void> {
    await dailyDB.updateOne(
        { User: userId, Date: date },
        { $set: { Voted: voted } }
    ).catch(() => { });
}

export async function playSong(interaction: ValidInteraction, client: CustomClient, query: string, opts: { enforceDailyLimit?: boolean } = {}) {

    try {
        // Daily play limit - voters play unlimited. Verification runs for every
        // non-voter (including users already at the cap, so a fresh vote unblocks
        // them immediately). Failed Top.gg checks fail open: the play goes
        // through uncounted, Voted: true is never persisted, and the next play
        // retries the verification. This runs before the player exists, so a
        // capped user never connects to voice at all.
        // Batch callers (playlist play-all) pass enforceDailyLimit: false to skip
        // this per-song gate - playerStart still counts and cuts off at the cap
        // when each track actually starts.
        if (opts.enforceDailyLimit !== false) {
            const limit = client.data.maxSongsPerDay;
            const dailyDoc = await getDailyPlaysDoc(interaction.user.id);

            if (dailyDoc.Voted !== true) {
                try {
                    const voted = await new Api(client.data.topgg.token).hasVoted(interaction.user.id);
                    await setVoted(interaction.user.id, dailyDoc.Date, voted);
                    dailyDoc.Voted = voted;
                } catch (error) {
                    if ((error as any)?.response?.statusCode === 404) {
                        // 404 = the user doesn't exist on top.gg (never
                        // registered there) - a definitive "not voted", NOT an
                        // unknown. Store false so the cap applies and they get
                        // the same vote message as every other non-voter.
                        // Never save null for this case.
                        await setVoted(interaction.user.id, dailyDoc.Date, false);
                        dailyDoc.Voted = false;
                    } else {
                        console.error('Top.gg API error:', error);
                        // Real API outage - mark verification as unknown so
                        // playerStart skips counting this user's plays until
                        // a check succeeds (fail-open policy).
                        await setVoted(interaction.user.id, dailyDoc.Date, null);
                        dailyDoc.Voted = null;
                    }
                }
            }

            // Only a confirmed non-voter at the cap is rejected; an unknown vote
            // status (Top.gg failure) fails open like the rest of the policy.
            if (dailyDoc.Voted === false && dailyDoc.Count >= limit) {
                return editReply(interaction, "❌", `You've used ${dailyDoc.Count}/${limit} free plays today. Vote me on [top.gg](${client.data.topgg.vote}) to keep playing!`);
            }
        }

        const result = await client.kazagumo.search(query, { requester: interaction.user });
        const link = `https://www.google.com/search?q=${encodeURIComponent(query)}`

        if (!result.tracks.length) {
            return editReply(interaction, "❌", "No result found");
        }

        // All checks passed and there are tracks to queue - only now create the
        // player (createPlayer connects to voice immediately), so a rejected or
        // failed request never leaves the bot sitting in the voice channel.
        // An existing player for the guild is reused (playlist loops, re-runs).
        let player = client.kazagumo.getPlayer(interaction.guildId as string);

        // A player whose voice connection died (manual kick, etc.) is stale:
        // kazagumo keeps the object and never updates its state on 'closed', so
        // the reliable signal is Discord's own voice state - if the bot isn't
        // in a channel, the player cannot play. Tear it down and create fresh.
        if (player && !interaction.guild?.members?.me?.voice.channel) {
            await player.destroy().catch(() => { });
            client.kazagumo.players.delete(interaction.guildId as string);
            player = undefined;
        }

        if (!player) {
            const voiceChannelId = (interaction.member as GuildMember)?.voice?.channel?.id;
            if (!voiceChannelId) return editReply(interaction, "❌", "You need to be in a voice channel to play music");

            player = await client.kazagumo.createPlayer({
                guildId: interaction.guildId as string,
                voiceId: voiceChannelId,
                textId: interaction.channel?.id as string,
                deaf: true
            });
        }

        if (result.type === "PLAYLIST") {
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
        } else {
            if (!player.queue.current) {
                if (player.state == 1) player.disconnect();
                player.destroy();
            }
            editReply(interaction, "❌", "No result found");
        }

    } catch (error) {
        console.error(error);
        editReply(interaction, "❌", `Something went wrong! Please report to us using \`/report\`.`);
    }
}
