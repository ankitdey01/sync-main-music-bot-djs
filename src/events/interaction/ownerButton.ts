import { ButtonInteraction, EmbedBuilder, Events, ActionRowBuilder, TextInputBuilder, TextInputStyle, ModalBuilder, LabelBuilder, italic, ColorResolvable } from "discord.js"
import { CustomClient, Event, paginate, reply, announcePreviews, buildAnnouncementEmbed, broadcastAnnouncement, formatAnnounceList } from "../../structure/index.js"

export default new Event({
    name: Events.InteractionCreate,

    async execute(interaction: ButtonInteraction, client: CustomClient) {
        if (!interaction.isButton()) return

        if (interaction.customId.startsWith("owner-announce-confirm-") || interaction.customId.startsWith("owner-announce-reject-")) {
            return handleAnnounceDecision(interaction, client)
        }

        if (!["owner-leave", "owner-servers", "owner-eval", "owner-announce"].includes(interaction.customId)) return

        if (!client.data.developers.includes(interaction.user.id)) return reply(
            interaction, "❌", "You cannot use this buttons", true
            )

        switch (interaction.customId) {

            case "owner-servers": {

                const servers = serverEmbed(Array.from(client.guilds.cache), 10, client)
                paginate(interaction, servers)

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
                    .setMaxLength(2048)

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

    const setStatus = (status: string, color: ColorResolvable) =>
        EmbedBuilder.from(interaction.message.embeds[0])
            .setColor(color)
            .spliceFields(0, interaction.message.embeds[0].fields.length)
            .addFields({ name: "Status", value: status })

    if (interaction.customId.startsWith("owner-announce-reject-")) {

        announcePreviews.delete(previewId)

        return interaction.update({
            embeds: [setStatus("❌ Announcement rejected. Nothing was sent.", "Red")],
            components: []
        })
    }

    if (!payload) {
        return interaction.update({
            embeds: [setStatus("⚠ This preview expired (bot restarted). Create the announcement again.", "Grey")],
            components: []
        })
    }

    // Consume the preview immediately so a double click can't double-send
    announcePreviews.delete(previewId)

    await interaction.deferUpdate()

    await interaction.message.edit({
        embeds: [setStatus(`📤 Broadcasting to **${client.guilds.cache.size}** server(s)...`, client.color)],
        components: []
    }).catch(() => { })

    const { sent, failed } = await broadcastAnnouncement(client, payload)

    const ReportEmbed = new EmbedBuilder()
        .setColor(client.color)
        .setTitle("__Announcement Report__")
        .setDescription(
            `**✅ Sent: ${sent.length} server(s)**\n\`\`\`${formatAnnounceList(sent)}\`\`\`` +
            `**❌ Not sent: ${failed.length} server(s)**\n\`\`\`${formatAnnounceList(failed)}\`\`\``
        )
        .setFooter({ text: `Requested by ${payload.requestedBy}` })
        .setTimestamp()

    await interaction.message.edit({ embeds: [ReportEmbed], components: [] }).catch(() => { })
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

