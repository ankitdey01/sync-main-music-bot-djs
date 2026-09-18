import { ChannelType, EmbedBuilder, BaseGuildTextChannel, PermissionsBitField } from "discord.js"
import { KazagumoPlayer, KazagumoTrack } from "kazagumo"
import { CustomClient, msToTimestamp, ShoukakuEvent, getMusicChannelSetup, musicSetupUpdate } from "../../structure/index.js"
import buttonDB from "../../schemas/tempbutton.js"
import { buttonEnable } from "../../systems/button.js"
import { getBackgroundAttachmentUrl } from "../../utils/imageUtils.js";

export default new ShoukakuEvent({
    name: "playerStart",
    async execute(player: KazagumoPlayer, track: KazagumoTrack, client: CustomClient) {

        if (!player.textId) return;

        const channel = await client.channels.fetch(player.textId).catch(() => null) as BaseGuildTextChannel;
        if (!channel) return;
        if (channel.type !== ChannelType.GuildText) return;
        if (!channel.guild?.members.me?.permissions.has(PermissionsBitField.Flags.SendMessages)) return;

        const link = `https://www.google.com/search?q=${encodeURIComponent(track.title)}`;
        const bgImage = track.thumbnail || getBackgroundAttachmentUrl();

        const cdata = await getMusicChannelSetup(player.guildId);

        const setupUpdateEmbed = new EmbedBuilder()
            .setColor(client.color)
            .setAuthor({
                name: "NOW PLAYING",
                iconURL: (track.requester as any)?.displayAvatarURL?.() || client.user?.displayAvatarURL()
            })
            .setDescription(`[\`\`${track.title}\`\`](${link})`)
            .addFields(
                { name: 'Requested by', value: `<@${(track.requester as any)?.id || 'Unknown'}>`, inline: true },
                { name: 'Song by', value: `\`${track.author}\``, inline: true },
                { name: 'Duration', value: `\`❯ ${msToTimestamp(track.length as number)}\``, inline: true },
            )
            .setImage(bgImage);

        // Playing in the setup channel: the panel is the NOW PLAYING display
        // (it already has its own buttons) - just keep it in sync.
        if (cdata && cdata.Channel === player.textId) {
            await musicSetupUpdate(client, player, setupUpdateEmbed);
            return;
        }

        // Playing anywhere else: send the controls to the command channel...
        const msg = await channel.send({
            embeds: [new EmbedBuilder()
                .setColor("Blue")
                .setAuthor({
                    name: "NOW PLAYING",
                    iconURL: (track.requester as any)?.displayAvatarURL?.() || client.user?.displayAvatarURL(),
                    url: client.data.links.invite
                })
                .setDescription(`[\`\`${track.title}\`\`](${link})`)
                .setImage(bgImage)
                .addFields(
                    { name: 'Requested by', value: `\`${(track as any).requester.username || 'Unknown'}\``, inline: true },
                    { name: 'Song by', value: `\`${track.author}\``, inline: true },
                    { name: 'Duration', value: `\`❯ ${msToTimestamp(track.length as number)}\``, inline: true })],
            components: [buttonEnable],
        }).catch(() => null);

        if (!msg || !msg.id) return;

        // Only one active NOW PLAYING message per channel - clear any leftovers
        // (e.g. from a track that ended before its doc was cleaned up) before
        // saving, so orphaned button docs can't accumulate.
        await buttonDB.deleteMany({ Guild: player.guildId, Channel: player.textId });
        await new buttonDB({
            Guild: player.guildId,
            Channel: player.textId,
            MessageID: msg.id
        }).save();

        // ...and keep the setup panel in sync with the new track
        if (cdata) await musicSetupUpdate(client, player, setupUpdateEmbed);
    }
});
