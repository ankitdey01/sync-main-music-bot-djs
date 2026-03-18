import { ChannelType, EmbedBuilder, BaseGuildTextChannel, PermissionsBitField } from "discord.js"
import { KazagumoPlayer, KazagumoTrack } from "kazagumo";
import { CustomClient, msToTimestamp, ShoukakuEvent } from "../../structure/index.js"
import buttonDB from "../../schemas/tempbutton.js"
import wait from "node:timers/promises"
import setupDB, { MusicChannelSchema } from "../../schemas/musicchannel.js"
import { musicSetupUpdate } from "../../structure/functions/setupUpdate.js"
import { buttonEnable } from "../../systems/button.js"
import { getBackgroundAttachmentUrl, getBackgroundAttachment } from "../../utils/imageUtils.js";

export default new ShoukakuEvent({
    name: "playerStart",
    async execute(player: KazagumoPlayer, track: KazagumoTrack, client: CustomClient) {

        if (!player.textId) return;

        const channel = await client.channels.fetch(player.textId).catch(() => null) as BaseGuildTextChannel;
        if (!channel) return;
        if (channel.type !== ChannelType.GuildText) return;
        if (!channel.guild?.members.me?.permissions.has(PermissionsBitField.Flags.SendMessages)) return;

        const link = `https://www.google.com/search?q=${encodeURIComponent(track.title)}`;

        const cdata = await setupDB.findOne<MusicChannelSchema>({
            Guild: player.guildId,
            Channel: player.textId
        });

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
            .setImage(track.thumbnail || getBackgroundAttachmentUrl());

        const backgroundAttachment = track.thumbnail ? null : getBackgroundAttachment();
        const files = backgroundAttachment ? [backgroundAttachment] : [];
        
        if (cdata) {
            await musicSetupUpdate(client, player, setupDB, setupUpdateEmbed, files);
        } else {
            const msg = await channel.send({
                embeds: [new EmbedBuilder()
                    .setColor("Blue")
                    .setAuthor({
                        name: "NOW PLAYING",
                        iconURL: (track.requester as any)?.displayAvatarURL?.() || client.user?.displayAvatarURL(),
                        url: client.data.links.invite
                    })
                    .setDescription(`[\`\`${track.title}\`\`](${link})`)
                    .setImage(track.thumbnail || getBackgroundAttachmentUrl())
                    .addFields(
                        { name: 'Requested by', value: `\`${(track as any).requester.username || 'Unknown'}\``, inline: true },
                        { name: 'Song by', value: `\`${track.author}\``, inline: true },
                        { name: 'Duration', value: `\`❯ ${msToTimestamp(track.length as number)}\``, inline: true })],
                components: [buttonEnable],
                files: track.thumbnail ? [] : (backgroundAttachment ? [backgroundAttachment] : [])
            }).catch((err: Error) => {
                if (err) return;
            });

            await musicSetupUpdate(client, player, setupDB, setupUpdateEmbed, track.thumbnail ? [] : (backgroundAttachment ? [backgroundAttachment] : []));

            if (!msg || !msg.id) return;

            const data = new buttonDB({
                Guild: player.guildId,
                Channel: player.textId,
                MessageID: msg.id
            });

            await wait.setTimeout(2000);
            await data.save();
        }
    }
});
