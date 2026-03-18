import { ButtonInteraction, EmbedBuilder, Events, ActionRowBuilder, TextInputBuilder, TextInputStyle, ModalBuilder, LabelBuilder, italic } from "discord.js"
import { CustomClient, Event, paginate, reply } from "../../structure/index.js"

export default new Event({
    name: Events.InteractionCreate,

    async execute(interaction: ButtonInteraction, client: CustomClient) {
        if (!interaction.isButton()) return
        if (!["owner-leave", "owner-servers", "owner-eval"].includes(interaction.customId)) return

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
        }

    },
})

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

