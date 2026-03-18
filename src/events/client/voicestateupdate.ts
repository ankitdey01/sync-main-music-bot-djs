import { Events, GuildMember, VoiceState } from "discord.js";
import { CustomClient, Event } from "../../structure/index.js";
import { BaseGuildTextChannel, EmbedBuilder } from "discord.js";
import buttonDB, { TempButtonSchema } from "../../schemas/tempbutton";
import { buttonDisable } from "../../systems/button";

export default new Event({
    name: Events.VoiceStateUpdate,
    async execute(oldState: VoiceState, newState: VoiceState, client: CustomClient) {
        // Check if bot was disconnected from voice channel
        if (oldState.member?.id === client.user?.id && oldState.channelId && !newState.channelId) {
            const player = client.kazagumo.getPlayer(oldState.guild?.id as string);
            if (player) {
                // Clean up buttons when bot is manually disconnected
                const channel = await oldState.guild.channels.fetch(player.textId as string).catch(() => { }) as BaseGuildTextChannel;
                if (channel) {
                    const data = await buttonDB.find<TempButtonSchema>({ Guild: player.guildId, Channel: player.textId });
                    for (let i = 0; i < data.length; i++) {
                        const msg = await channel.messages.fetch(data[i].MessageID).catch(() => { });
                        if (msg && msg.editable) await msg.edit({ components: [buttonDisable] }).catch(() => { });
                        if (data && data[i]) await data[i].deleteOne();
                    }
                }
                player.destroy();
            }
            return;
        }

        // checks if someone left the vc
        if (oldState.channelId && !newState.channelId) {
            const botVoiceState = (oldState.guild.members.me as GuildMember).voice;
            if (!botVoiceState.channel) return

            const player = client.kazagumo.getPlayer(oldState.guild?.id as string)
            if (!player) return

            if (botVoiceState.channel.members.filter((m) => !m.user.bot).size < 1) {
                //console.log(`[VOICE_STATE] No users in VC, setting timeout for guild ${oldState.guild.id}`);
                const timeout = setTimeout(async () => {

                    if (!player) return

                    const channel = await oldState.guild.channels.fetch(player.textId as string).catch(() => { }) as BaseGuildTextChannel
                    if (!channel) {
                        player.destroy();
                        return;
                    }
                    if(player.state == 1) player.disconnect();
                    await player.destroy();

                    await channel.send({
                        embeds: [new EmbedBuilder()
                            .setAuthor({
                                name: "Left the VC because of inactivity exceeding 5 minutes",
                                iconURL: client.user?.displayAvatarURL()
                            })
                            .setColor(client.color)
                        ]
                    }).catch(() => { })

                    const data = await buttonDB.find<TempButtonSchema>({ Guild: player.guildId, Channel: player.textId })
                    for (let i = 0; i < data.length; i++) {
                        const msg = await channel.messages.fetch(data[i].MessageID)

                        if (msg && msg.editable) await msg.edit({ components: [buttonDisable] })
                        if (data && data[i]) await data[i].deleteOne()
                    }
                }, 1000 * 60 * 2); // 1000 * 60 * 2 = 2 mins
                (botVoiceState as any).channel.timeout = timeout;
            }
        }

        // Check if someone joined a voice channel
        if (!oldState.channelId && newState.channelId) {
            const botVoiceState = (newState.guild.members.me as GuildMember).voice;
            if (!botVoiceState.channel) return

            if (botVoiceState.channel.id === newState.channelId) {
                if ((botVoiceState as any).channel.timeout) {
                    clearTimeout((botVoiceState as any).channel.timeout);
                    (botVoiceState as any).channel.timeout = null;
                }
            }
        }
    },
})