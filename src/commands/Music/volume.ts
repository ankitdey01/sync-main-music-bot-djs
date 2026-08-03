import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { SlashCommand, memberVoice, botVC, differentVoice, reply, editReply } from "../../structure/index.js";

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Change the volume of the player')
        .addIntegerOption(opt => 
            opt.setName('volume')
                .setDescription('Enter the volume to set (Ex: 80)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),
    category: "Music",
    async execute(interaction, client) {

        if (await memberVoice(interaction)) return
        if (await botVC(interaction)) return
        if (await differentVoice(interaction)) return

        const player = client.kazagumo.getPlayer(interaction.guild?.id as string)
        if (!player) return reply(interaction, "❌", "No song player was found", true)

        const vol = interaction.options.getInteger("volume", true)

        await interaction.deferReply()
        player.setVolume(vol)

        return editReply(interaction, "🔊", `Volume set to ${vol}`)
    }
})