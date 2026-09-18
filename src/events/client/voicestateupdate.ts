import { Events, GuildMember, VoiceState, BaseGuildTextChannel, EmbedBuilder } from "discord.js";
import { KazagumoPlayer, PlayerState } from "kazagumo";
import { CustomClient, Event, musicSetupUpdate } from "../../structure/index.js";
import { clearChannelButtons } from "../../systems/button.js";
import { getBackgroundAttachmentUrl } from "../../utils/imageUtils.js";

// Pending leave-timers per guild, in a module-level map instead of ad-hoc
// properties on channel objects - every path can cancel the right timer
// deterministically, and timers survive channel cache churn.
const INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000;
const inactivityTimers = new Map<string, NodeJS.Timeout>();

function clearInactivityTimer(guildId: string): void {
    const timer = inactivityTimers.get(guildId);
    if (timer) {
        clearTimeout(timer);
        inactivityTimers.delete(guildId);
    }
}

export default new Event({
    name: Events.VoiceStateUpdate,
    async execute(oldState: VoiceState, newState: VoiceState, client: CustomClient) {

        // Bot was disconnected from voice channel by a member (kicked / manual
        // disconnect). A bot-initiated disconnect already resets the panel via
        // playerEmpty, so only react when kazagumo still thinks it is connected.
        if (oldState.member?.id === client.user?.id && oldState.channelId && !newState.channelId) {
            clearInactivityTimer(oldState.guild.id);

            const player = client.kazagumo.getPlayer(oldState.guild.id);
            if (!player || player.state !== PlayerState.CONNECTED) return;

            await clearChannelButtons(client, oldState.guild.id, player.textId as string);

            try {
                await player.destroy();
            } catch { /* already destroyed elsewhere */ }

            // playerClosed can't fire here - destroy() removed the player's
            // listeners before Lavalink's close event arrives - so reset the
            // setup panel explicitly, same as every other stop path.
            const setupUpdateEmbed = new EmbedBuilder()
                .setColor(client.color)
                .setTitle(`No song playing currently`)
                .setImage(getBackgroundAttachmentUrl())
                .setDescription(
                    `**[Invite Me](${client.data.links.invite})  :  [Support Server](${client.data.links.support})  :  [Vote Me](${client.data.topgg.vote})**`
                );

            await musicSetupUpdate(client, player, setupUpdateEmbed);
            return;
        }

        // Someone left their voice channel
        if (oldState.channelId && !newState.channelId) {
            const botVoiceState = (oldState.guild.members.me as GuildMember).voice;
            if (!botVoiceState.channel) return;

            const player = client.kazagumo.getPlayer(oldState.guild.id);
            if (!player) return;

            // Last human left the bot's VC -> schedule the inactivity leave
            if (botVoiceState.channel.members.filter((m) => !m.user.bot).size < 1) {
                clearInactivityTimer(oldState.guild.id);

                const timer = setTimeout(async () => {
                    inactivityTimers.delete(oldState.guild.id);

                    // Re-validate inside the timer: users may have rejoined, and
                    // the player may have been replaced or destroyed meanwhile.
                    const current = client.kazagumo.getPlayer(oldState.guild.id);
                    if (!current) return;

                    const botChannel = oldState.guild.members.me?.voice.channel;
                    if (botChannel && botChannel.members.filter((m) => !m.user.bot).size > 0) return;

                    try {
                        await current.destroy();
                    } catch { /* already destroyed elsewhere */ }

                    const channel = await oldState.guild.channels.fetch(current.textId as string).catch(() => null) as BaseGuildTextChannel | null;
                    if (channel && channel.isTextBased()) {
                        await channel.send({
                            embeds: [new EmbedBuilder()
                                .setAuthor({
                                    name: "Left the VC because of inactivity exceeding 2 minutes",
                                    iconURL: client.user?.displayAvatarURL()
                                })
                                .setColor(client.color)
                            ]
                        }).catch(() => { });
                    }

                    await clearChannelButtons(client, oldState.guild.id, current.textId as string);
                }, INACTIVITY_TIMEOUT_MS);
                inactivityTimers.set(oldState.guild.id, timer);
            }
            return;
        }

        // Someone joined a voice channel
        if (!oldState.channelId && newState.channelId) {
            const botVoiceState = (newState.guild.members.me as GuildMember).voice;
            if (!botVoiceState.channel) return;

            // Joining the bot's channel cancels the pending inactivity leave
            if (botVoiceState.channel.id === newState.channelId) {
                clearInactivityTimer(newState.guild.id);
            }
        }
    },
})
