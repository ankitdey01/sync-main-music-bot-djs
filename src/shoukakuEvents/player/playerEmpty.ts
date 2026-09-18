import { ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, BaseGuildTextChannel, TextChannel } from "discord.js";
import { KazagumoPlayer, PlayerState } from "kazagumo";
import emoji from "../../systems/emojis.js";
import { musicSetupUpdate, getMusicChannelSetup, ShoukakuEvent, CustomClient } from "../../structure/index.js";
import { clearChannelButtons } from "../../systems/button.js";
import { getBackgroundAttachmentUrl } from "../../utils/imageUtils.js";

export default new ShoukakuEvent({
    name: "playerEmpty",
    async execute(player: KazagumoPlayer, client: CustomClient) {
        //console.log(`[PLAYER_EMPTY] Disconnecting from voice channel in guild`);

        if (!player.textId) return;
        if (!client.channels) return;
        const channel = await client.channels?.fetch(player.textId).catch(() => null) as BaseGuildTextChannel;
        if (!channel) return;

        await clearChannelButtons(client, player.guildId, player.textId);

        if (channel.type !== ChannelType.GuildText) return;
        if (!channel.guild?.members.me?.permissionsIn(channel as TextChannel).has(PermissionFlagsBits.SendMessages)) return;

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

        const cdata = await getMusicChannelSetup(player.guildId);

        if (!cdata) {
            await channel.send({
                embeds: [leaveEmbed],
                components: [settings]
            }).catch(() => { });
        }

        // Disconnect from voice channel and destroy the player
        //console.log(`[PLAYER_EMPTY] Disconnecting from voice channel in guild ${player.guildId}`);
        if (player.state == 1) player.disconnect();
        if (player.state !== PlayerState.DESTROYING && player.state !== PlayerState.DESTROYED) await player.destroy()

        const setupUpdateEmbed = new EmbedBuilder()
            .setColor(client.color)
            .setTitle(`No song playing currently`)
            .setImage(getBackgroundAttachmentUrl())
            .setDescription(
                `**[Invite Me](${client.data.links.invite})  :  [Support Server](${client.data.links.support})  :  [Vote Me](${client.data.topgg.vote})**`
            );

        await musicSetupUpdate(client, player, setupUpdateEmbed);
    }
});
