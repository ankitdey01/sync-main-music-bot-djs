import { ModalSubmitInteraction, Events, InteractionType, EmbedBuilder, MessageFlags } from "discord.js"
import { CustomClient, Event } from "../../structure/index.js"

export default new Event({
    name: Events.InteractionCreate,
    async execute(interaction: ModalSubmitInteraction, client: CustomClient): Promise<any> {

        if (interaction.type !== InteractionType.ModalSubmit) return
        if (!interaction.guild || interaction.user.bot) return

        if (!["owner-leave-modal", "owner-eval-modal"].includes(interaction.customId)) return

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
        }
    }
})

