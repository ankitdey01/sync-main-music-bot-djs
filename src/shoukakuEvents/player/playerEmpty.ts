import { ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, BaseGuildTextChannel, TextChannel } from "discord.js";
import { KazagumoPlayer, PlayerState } from "kazagumo";
import emoji from "../../systems/emojis.js";
import { musicSetupUpdate, getMusicChannelSetup, idlePanelEmbed, ShoukakuEvent, CustomClient } from "../../structure/index.js";
import { clearChannelButtons } from "../../systems/button.js";

export default new ShoukakuEvent({
    name: "playerEmpty",
    async execute(player: KazagumoPlayer, client: CustomClient) {
        //console.log(`[PLAYER_EMPTY] Disconnecting from voice channel in guild`);

        // Teardown first and unconditionally - it must never be skipped by a
        // messaging failure (e.g. playback ran in a voice channel's text
        // chat, or the channel is gone). This also clears stale button docs
        // guild-wide, so leftovers can't survive into the next session.
        await clearChannelButtons(client, player.guildId, player.textId ?? "");

        //console.log(`[PLAYER_EMPTY] Disconnecting from voice channel in guild ${player.guildId}`);
        if (player.state == 1) player.disconnect();
        if (player.state !== PlayerState.DESTROYING && player.state !== PlayerState.DESTROYED) await player.destroy()

        if (!player.textId) return;
        const channel = await client.channels?.fetch(player.textId).catch(() => null) as BaseGuildTextChannel | null;

        const cdata = await getMusicChannelSetup(player.guildId);

        // Queue-end notice goes to text channels and voice-channel text chats
        const canSend = channel
            && (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice)
            && channel.guild?.members.me?.permissionsIn(channel as TextChannel).has(PermissionFlagsBits.SendMessages);

        const leaveEmbed = new EmbedBuilder()
            .setColor(client.color)
            .setAuthor({
                name: "Queue has ended! No more music to play...",
                iconURL: client.user?.displayAvatarURL()
            });

        const settings = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setLabel("Invite Me")
                .setURL(client.data.links.invite)
                .setEmoji(emoji.link)
                .setStyle(ButtonStyle.Link),

            new ButtonBuilder()
                .setLabel("Vote Me")
                .setURL(client.data.topgg.vote)
                .setEmoji(emoji.topgg)
                .setStyle(ButtonStyle.Link),
        );

        // The setup panel already renders the queue-ended state via
        // musicSetupUpdate below - skip the chat message only when playback
        // happened in the setup channel itself, not whenever a setup exists.
        if (canSend && (!cdata || cdata.Channel !== player.textId)) {
            await channel.send({
                embeds: [leaveEmbed],
                components: [settings]
            }).catch(() => { });
        }

        const setupUpdateEmbed = idlePanelEmbed(client);

        await musicSetupUpdate(client, player, setupUpdateEmbed);
    }
});
