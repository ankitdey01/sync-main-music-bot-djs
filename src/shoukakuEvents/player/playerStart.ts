import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Colors, EmbedBuilder, BaseGuildTextChannel, PermissionsBitField, TextChannel } from "discord.js"
import { KazagumoPlayer, KazagumoTrack } from "kazagumo"
import dailyDB from "../../schemas/dailyplays.js";
import emojis from "../../systems/emojis.js";
import { CustomClient, msToTimestamp, ShoukakuEvent, getDailyPlaysDoc, getMusicChannelSetup, musicSetupUpdate, todayUTC } from "../../structure/index.js"
import buttonDB from "../../schemas/tempbutton.js"
import { buttonEnable, clearChannelButtons } from "../../systems/button.js"

export default new ShoukakuEvent({
    name: "playerStart",
    async execute(player: KazagumoPlayer, track: KazagumoTrack, client: CustomClient) {

        if (!player.textId) return;

        const channel = await client.channels.fetch(player.textId).catch(() => null) as BaseGuildTextChannel | null;

        // Channel-level check (same as playerEmpty/playerException) - the
        // guild-wide permission ignores channel overwrites and would report
        // sendable in channels where the bot is muted.
        const canSend = channel
            && (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice)
            && channel.guild?.members.me?.permissionsIn(channel as TextChannel).has(PermissionsBitField.Flags.SendMessages);

        // Vote links styled like /vote - emoji inside the button, clean embed
        const voteButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setLabel("Vote Me")
                .setEmoji(emojis.topgg)
                .setStyle(ButtonStyle.Link)
                .setURL(client.data.topgg.vote),
            new ButtonBuilder()
                .setLabel("Support Server")
                .setStyle(ButtonStyle.Link)
                .setURL(client.data.links.support)
        );

        // Daily play limit - count each non-voter request and cut off at the
        // cap. Voters skip counting entirely, so their songs are never limited.
        const limit = client.data.maxSongsPerDay;
        let lastFreePlay = false;
        const requesterId = (track.requester as any)?.id;
        if (requesterId) {
            // Capture the day once so the doc fetch and the increment can't
            // straddle UTC midnight and end up matching different days.
            const today = todayUTC();
            const dailyDoc = await getDailyPlaysDoc(requesterId, today);
            // Voted === false means "verified non-voter": null marks an unknown
            // (failed Top.gg check) and true a voter - neither is counted.
            if (dailyDoc.Voted === false) {
                // Distinguish DB failures (fail open, keep playing) from a
                // genuine cap-reached result (null with no error → notify + teardown).
                let updated;
                let dbError: unknown = null;
                try {
                    updated = await dailyDB.findOneAndUpdate(
                        { User: requesterId, Date: today, Count: { $lt: limit } },
                        { $inc: { Count: 1 } },
                        { returnDocument: "after" }
                    );
                } catch (err) {
                    dbError = err;
                }

                if (dbError) {
                    client.logger.error("DailyLimit", `Daily cap check failed open for ${requesterId}: ${dbError}`);
                } else if (!updated) {
                    if (canSend) {
                        await channel.send({
                            embeds: [new EmbedBuilder()
                                .setColor(Colors.DarkRed)
                                .setDescription(`Your daily free limit has ended (${limit} songs). Vote to keep playing!`)],
                            components: [voteButtons]
                        }).catch(() => null);
                    }
                    if (player.state == 1) player.disconnect();
                    player.destroy();
                    return;
                }

                // This track is the user's last free one - the notice goes out
                // after the main track embed below, not before it.
                // Only when the increment succeeded (fail-open skips this).
                if (!dbError && updated && updated.Count >= limit) lastFreePlay = true;
            }
        }

        const sendLastPlayNotice = async () => {
            if (!canSend) return;
            await channel.send({
                embeds: [new EmbedBuilder()
                    .setColor(client.color)
                    .setDescription(`**That was your last free play for today (${limit}/${limit}). Vote to keep playing!**`)],
                components: [voteButtons]
            }).catch(() => null);
        };

        if (!channel) return;
        // NOW PLAYING goes to text channels and voice-channel text chats
        // (slash commands run inside a VC's chat resolve to the voice channel)
        if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildVoice) return;
        if (!canSend) return;

        const link = `https://www.google.com/search?q=${encodeURIComponent(track.title)}`;
        const bgImage = track.thumbnail || process.env.BACKGROUND_URL || null;

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
            if (lastFreePlay) await sendLastPlayNotice();
            return;
        }

        // Playing anywhere else: send the controls to the command channel...
        const msg = await channel.send({
            embeds: [new EmbedBuilder()
                .setColor("#2B2D31")
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

        // Only one active NOW PLAYING message per channel - disable and clear
        // any leftovers (e.g. from a track that ended before its doc was
        // cleaned up) before saving, so orphaned button docs can't accumulate.
        await clearChannelButtons(client, player.guildId, player.textId);
        await new buttonDB({
            Guild: player.guildId,
            Channel: player.textId,
            MessageID: msg.id
        }).save();

        // ...and keep the setup panel in sync with the new track
        if (cdata) await musicSetupUpdate(client, player, setupUpdateEmbed);

        // Last-free-play notice lands after the main track embed
        if (lastFreePlay) await sendLastPlayNotice();
    }
});
