import { ButtonInteraction, Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, LabelBuilder } from "discord.js"
import { memberVoice, joinable, differentVoice, stageCheck, CustomClient, Event } from "../../structure/index.js"

export default new Event({
    name: Events.InteractionCreate,
    async execute(interaction: ButtonInteraction) {
        if (!interaction.isButton()) return
        if (interaction.customId !== "search-song") return

        if (await memberVoice(interaction)) return
        if (await joinable(interaction)) return
        if (await differentVoice(interaction)) return
        if (await stageCheck(interaction)) return

        const modal = new ModalBuilder()
            .setCustomId("song-req")
            .setTitle("Play a song")

        const song = new TextInputBuilder()
            .setCustomId("song-req-name")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Enter the song name")
            .setRequired(true)

        modal.addLabelComponents(new LabelBuilder()
            .setLabel("Name")
            .setTextInputComponent(song))

        await interaction.showModal(modal)
    }
})