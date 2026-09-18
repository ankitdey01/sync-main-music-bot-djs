import { ModalSubmitInteraction, Events, InteractionType, MessageFlags } from "discord.js"
import { CustomClient, editReply, Event, playSong } from "../../structure/index.js"

export default new Event({
    name: Events.InteractionCreate,
    async execute(interaction: ModalSubmitInteraction, client: CustomClient) {

        if (interaction.type !== InteractionType.ModalSubmit) return
        if (!interaction.guild || interaction.user.bot) return

        if (interaction.customId !== "song-req") return

        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

        const query = interaction.fields.getTextInputValue("song-req-name")

        if (!interaction.channel) return editReply(interaction, "❌", `An **error** has occured! Please report to us using \`/report\`.`)

        playSong(interaction, client, query)

    }
})