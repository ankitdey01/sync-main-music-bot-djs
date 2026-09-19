import { ButtonInteraction, EmbedBuilder, Events, TextInputBuilder, TextInputStyle, ModalBuilder, LabelBuilder, ColorResolvable } from "discord.js"
import { KazagumoPlayer } from "kazagumo"
import { CustomClient, Event, paginate, reply, editReply, announcePreviews, announceSending, broadcastAnnouncement, formatAnnounceList, msToTimestamp } from "../../structure/index.js"

export default new Event({
    name: Events.InteractionCreate,

    async execute(interaction: ButtonInteraction, client: CustomClient) {
        if (!interaction.isButton()) return

        if (interaction.customId.startsWith("owner-announce-confirm-") || interaction.customId.startsWith("owner-announce-reject-")) {
            return handleAnnounceDecision(interaction, client)
        }

        if (!["owner-leave", "owner-servers", "owner-eval", "owner-announce", "owner-players"].includes(interaction.customId)) return

        if (!client.data.developers.includes(interaction.user.id)) return reply(
            interaction, "❌", "You cannot use this buttons", true
            )

        switch (interaction.customId) {

            case "owner-servers": {

                await interaction.deferReply()
                const servers = serverEmbed(Array.from(client.guilds.cache), 10, client)
                await paginate(interaction, servers)

            }
                break;

            case "owner-players": {

                await interaction.deferReply()
                const players = Array.from(client.kazagumo.players.values())

                if (!players.length) {
                    return editReply(interaction, "❌", "No active players right now")
                }

                const embeds = playerEmbeds(players, client)
                await paginate(interaction, embeds)

            }
                break;

            case "owner-leave": {

                const modal = new ModalBuilder()
                    .setCustomId("owner-leave-modal")
                    .setTitle("Guild Leave")

                const guildId = new TextInputBuilder()
                    .setCustomId("owner-leave-modal-guildId")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("Enter the Guild ID to leave")
                    .setRequired(true)

                const guildIdLabel = new LabelBuilder()
                    .setLabel("GUILD ID")
                    .setTextInputComponent(guildId)

                modal.addLabelComponents(guildIdLabel)

                await interaction.showModal(modal)
            }
                break;

            case "owner-eval": {

                const modal = new ModalBuilder()
                    .setCustomId("owner-eval-modal")
                    .setTitle("Eval")

                const code = new TextInputBuilder()
                    .setCustomId("owner-eval-modal-code")
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder("Enter the code to eval")
                    .setRequired(true)

                const codeLabel = new LabelBuilder()
                    .setLabel("CODE")
                    .setTextInputComponent(code)

                modal.addLabelComponents(codeLabel)

                await interaction.showModal(modal)

            }

                break;
            case "owner-announce": {

                const modal = new ModalBuilder()
                    .setCustomId("owner-announce-modal")
                    .setTitle("Announcement")

                const title = new TextInputBuilder()
                    .setCustomId("owner-announce-modal-title")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("Embed title")
                    .setRequired(true)
                    .setMaxLength(256)

                const description = new TextInputBuilder()
                    .setCustomId("owner-announce-modal-description")
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder("Embed description")
                    .setRequired(true)
                    .setMaxLength(4000)

                const thumbnail = new TextInputBuilder()
                    .setCustomId("owner-announce-modal-thumbnail")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("Thumbnail image URL (optional)")
                    .setRequired(false)

                const image = new TextInputBuilder()
                    .setCustomId("owner-announce-modal-image")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("Embed image URL (optional)")
                    .setRequired(false)

                const footer = new TextInputBuilder()
                    .setCustomId("owner-announce-modal-footer")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("Embed footer text (optional)")
                    .setRequired(false)
                    // Capped at 1500 (not Discord's 2048) so title (256) +
                    // description (4000) + footer + preview Status field can
                    // never exceed Discord's 6000-char aggregate embed limit.
                    .setMaxLength(1500)

                modal.addLabelComponents(
                    new LabelBuilder().setLabel("TITLE").setTextInputComponent(title),
                    new LabelBuilder().setLabel("DESCRIPTION").setTextInputComponent(description),
                    new LabelBuilder().setLabel("THUMBNAIL URL").setTextInputComponent(thumbnail),
                    new LabelBuilder().setLabel("IMAGE URL").setTextInputComponent(image),
                    new LabelBuilder().setLabel("FOOTER").setTextInputComponent(footer)
                )

                await interaction.showModal(modal)
            }

                break;
        }

    },
})

async function handleAnnounceDecision(interaction: ButtonInteraction, client: CustomClient) {

    if (!client.data.developers.includes(interaction.user.id)) return reply(
        interaction, "❌", "You cannot use this buttons", true
        )

    const previewId = interaction.customId.replace("owner-announce-confirm-", "").replace("owner-announce-reject-", "")
    const payload = announcePreviews.get(previewId)

    const baseEmbed = interaction.message?.embeds?.[0]
    const setStatus = (status: string, color: ColorResolvable) =>
        (baseEmbed ? EmbedBuilder.from(baseEmbed) : new EmbedBuilder())
            .setColor(color)
            .spliceFields(0, baseEmbed?.fields.length ?? 0)
            .addFields({ name: "Status", value: status })

    // In-flight guard FIRST, before either branch: while a broadcast for this
    // preview is active, both Confirm and Reject must preserve that status.
    // Otherwise Reject would falsely report "nothing was sent" and overwrite
    // the confirm flow's Broadcasting status.
    if (announceSending.has(previewId)) {
        return interaction.update({
            embeds: [setStatus("📤 Already broadcasting this announcement, please wait...", client.color)],
            components: []
        }).catch(() => { })
    }

    if (interaction.customId.startsWith("owner-announce-reject-")) {

        announcePreviews.delete(previewId)

        return interaction.update({
            embeds: [setStatus("❌ Announcement rejected. Nothing was sent.", "Red")],
            components: []
        }).catch(() => { })
    }

    if (!payload) {
        return interaction.update({
            embeds: [setStatus("⚠ This preview expired (bot restarted). Create the announcement again.", "Grey")],
            components: []
        }).catch(() => { })
    }

    // Reserve the preview BEFORE awaiting acknowledgement so concurrent
    // confirm handlers can't both pass the guard above and double-broadcast.
    // announcePreviews stays untouched until ack succeeds.
    announceSending.add(previewId)
    try {
        await interaction.deferUpdate()
    } catch {
        announceSending.delete(previewId)
        return
    }

    // Consume the preview only after a successful ack so a failed ack doesn't
    // burn it (which is what made the 2nd click say "restarted").
    announcePreviews.delete(previewId)

    await interaction.editReply({
        embeds: [setStatus(`📤 Broadcasting to **${client.guilds.cache.size}** server(s)...`, client.color)],
        components: []
    }).catch(() => { })

    let sent: string[] = []
    let failed: string[] = []
    try {
        ({ sent, failed } = await broadcastAnnouncement(client, payload))
    } catch (error) {
        client.logger.error("Announce", `Broadcast failed: ${error}`)
    } finally {
        announceSending.delete(previewId)
    }

    // Keep the combined description under Discord's 4096-char embed limit so
    // the final edit can't fail and leave the stale "Broadcasting..." status;
    // the totals above still reflect every server.
    const clip = (text: string, max: number) => text.length > max ? text.slice(0, max - 1) + "…" : text

    const ReportEmbed = new EmbedBuilder()
        .setColor(client.color)
        .setTitle("__Announcement Report__")
        .setDescription(
            `**✅ Sent: ${sent.length} server(s)**\n\`\`\`${clip(formatAnnounceList(sent), 1600)}\`\`\`` +
            `**❌ Not sent: ${failed.length} server(s)**\n\`\`\`${clip(formatAnnounceList(failed), 1600)}\`\`\``
        )
        .setFooter({ text: `Requested by ${payload.requestedBy}` })
        .setTimestamp()

    await interaction.editReply({ embeds: [ReportEmbed], components: [] }).catch(() => { })
}

function playerEmbeds(players: KazagumoPlayer[], client: CustomClient): EmbedBuilder[] {

    return players.map((player, index) => {

        const guild = client.guilds.cache.get(player.guildId)
        const track = player.queue.current

        const requester = track?.requester as { id?: string; username?: string; tag?: string } | undefined

        // Listeners = non-bot members in the player's voice channel, else Unavailable
        let listeners = "Unavailable"
        const voiceChannel = player.voiceId ? guild?.channels.cache.get(player.voiceId) : undefined
        if (voiceChannel && voiceChannel.isVoiceBased()) {
            listeners = `${voiceChannel.members.filter(m => !m.user.bot).size}`
        }

        // Playing since = elapsed wall-clock time since the player was created.
        // Backfill the stamp for players created before this tracking existed.
        let createdAt = player.data.get("createdAt") as number | undefined
        if (!createdAt) {
            createdAt = Date.now()
            player.data.set("createdAt", createdAt)
        }

        const playingSince = `<t:${Math.floor(createdAt / 1000)}:R> (\`${msToTimestamp(Date.now() - createdAt)}\`)`

        const state = player.paused ? "⏸ Paused" : player.playing ? "▶ Playing" : "⏹ Idle"

        return new EmbedBuilder()
            .setColor(client.color)
            .setAuthor({ name: `${client.user?.username} • Active Players (${players.length})`, iconURL: guild?.iconURL() ?? client.user?.displayAvatarURL() })
            .setTitle(`${guild?.name ?? "Unknown guild"}`)
            .setDescription(
                track
                    ? `**[${track.title}](${track.uri || track.realUri || `https://www.google.com/search?q=${encodeURIComponent(track.title)}`})**\nby \`${track.author ?? "Unknown"}\``
                    : "*Nothing currently playing*"
            )
            .addFields(
                { name: "Guild ID", value: `\`${player.guildId}\``, inline: true },
                { name: "Queue size", value: `\`${player.queue.size}\` (+ current = \`${player.queue.totalSize}\`)`, inline: true },
                { name: "Listeners", value: `\`${listeners}\``, inline: true },
                {
                    name: "Requester",
                    value: requester?.id ? `<@${requester.id}> (\`${requester.username ?? requester.tag ?? "Unknown"}\` • \`${requester.id}\`)` : "`Unknown`",
                    inline: false
                },
                { name: "Playing since", value: playingSince, inline: true },
                { name: "State", value: `\`${state}\``, inline: true }
            )
            .setFooter({ text: `Player ${index + 1} of ${players.length} • VC: ${player.voiceId ?? "Unknown"}` })
            .setTimestamp()
    })

}

function serverEmbed(pages: any[], number: number, client: CustomClient): EmbedBuilder[] {

    const Embeds: EmbedBuilder[] = []
    let k = number

    for (let i = 0; i < pages.length; i += number) {

        const current = pages.slice(i, k)

        k += number

        const MappedData = current.map(x => {

            return `Name: ${x[1].name} | ID: ${x[1].id}\n${x[1].memberCount} Members | Owner: ${x[1].ownerId}`

        }).join("\n\n")

        const LIST = new EmbedBuilder()
            .setAuthor({ name: `${client.user?.username} is in ${client.guilds.cache.size} server`, iconURL: client.user?.displayAvatarURL() })
            .setColor("DarkRed")
            .setDescription(`\`\`\`${MappedData}\`\`\``)

        Embeds.push(LIST)

    }

    return Embeds

}

