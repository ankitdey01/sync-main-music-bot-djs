import { ModalSubmitInteraction, Events, InteractionType, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, BaseGuildTextChannel } from "discord.js"
import { randomUUID } from "node:crypto"
import { CustomClient, Event, AnnouncementPayload, announcePreviews, buildAnnouncementEmbed } from "../../structure/index.js"

export default new Event({
    name: Events.InteractionCreate,
    async execute(interaction: ModalSubmitInteraction, client: CustomClient): Promise<any> {

        if (interaction.type !== InteractionType.ModalSubmit) return
        if (!interaction.guild || interaction.user.bot) return

        if (!["owner-leave-modal", "owner-eval-modal", "owner-announce-modal"].includes(interaction.customId)) return

        // Check if user is a developer before processing owner modals
        if (!client.data.developers.includes(interaction.user.id)) {
            return interaction.reply({ 
                content: "❌ You cannot use this feature. This is restricted to bot developers only.", 
                flags: MessageFlags.Ephemeral 
            }).catch(() => {});
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

        switch (interaction.customId) {

            case "owner-leave-modal": {

                const id = interaction.fields.getTextInputValue("owner-leave-modal-guildId")

                const Guild = await client.guilds.fetch(id)

                if (!Guild) return interaction.editReply({ content: "NO GUILD WAS FOUND WITH THAT ID" })

                const Embed = new EmbedBuilder()
                    .setColor(client.color)
                    .setTitle(`Left ${Guild.name}`)
                    .setDescription(`\`\`\`Successfully left the interaction.guild\nOwner ID: ${Guild.ownerId}\nMember Count: ${Guild.memberCount}\`\`\``)
                    .setThumbnail(Guild.iconURL())
                    .setTimestamp()

                await Guild.leave()

                interaction.editReply({
                    embeds: [Embed],
                })

            }

                break;

            case "owner-eval-modal": {

                const code = interaction.fields.getTextInputValue("owner-eval-modal-code")

                try {
                    
                    var result = eval(code)

                } catch (error) {
                    return interaction.editReply("THE CODE CAN'T BE EVALED")
                }

                if (!result) return interaction.editReply("THE CODE CAN'T BE EVALED")

                const Embed = new EmbedBuilder()
                    .setColor(client.color)
                    .setDescription(`\`\`\`${result.toString()}\`\`\``)
                    .setTitle("__EVALED CODE__")
                    .setFooter({ text: "Eval" })
                    .setTimestamp()

                interaction.editReply({ embeds: [Embed] })

            }

                break;

            case "owner-announce-modal": {

                const payload: AnnouncementPayload = {
                    title: interaction.fields.getTextInputValue("owner-announce-modal-title"),
                    description: interaction.fields.getTextInputValue("owner-announce-modal-description"),
                    thumbnail: interaction.fields.getTextInputValue("owner-announce-modal-thumbnail") || undefined,
                    image: interaction.fields.getTextInputValue("owner-announce-modal-image") || undefined,
                    footer: interaction.fields.getTextInputValue("owner-announce-modal-footer") || undefined,
                    requestedBy: interaction.user.id
                }

                const logAddress = client.data.devBotEnabled ? client.data.dev.log.guild : client.data.prod.log.guild
                const logsChannel = await client.channels.fetch(logAddress).catch(() => null) as BaseGuildTextChannel | null

                if (!logsChannel || !logsChannel.isTextBased()) {
                    return interaction.editReply({ content: "❌ No logs channel is configured. Set the log channel ID in the environment variables first." })
                }

                const previewId = randomUUID()
                announcePreviews.set(previewId, payload)

                const PreviewEmbed = buildAnnouncementEmbed(client, payload)
                    .addFields({
                        name: "Status",
                        value: `⏳ **Preview** — will be sent to **${client.guilds.cache.size}** server(s), one message each. Confirm or reject below.`
                    })

                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`owner-announce-confirm-${previewId}`)
                        .setLabel("Confirm Send")
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId(`owner-announce-reject-${previewId}`)
                        .setLabel("Reject")
                        .setStyle(ButtonStyle.Secondary)
                )

                const previewMessage = await logsChannel.send({ embeds: [PreviewEmbed], components: [row] }).catch(() => null)

                if (!previewMessage) {
                    announcePreviews.delete(previewId)
                    return interaction.editReply({ content: "❌ Failed to send the preview to the logs channel." }).catch(() => { })
                }

                interaction.editReply({ content: `📤 Preview sent to <#${logsChannel.id}> — confirm or reject it there.` }).catch(() => { })

            }

                break;
        }
    }
})

