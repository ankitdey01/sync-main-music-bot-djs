import { SlashCommandBuilder } from "discord.js";
import { SlashCommand, memberVoice, botVC, differentVoice, reply, editReply } from "../../structure";

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the current track'),
    category: "Music",
    async execute(interaction, client) {

        if (await memberVoice(interaction)) return
        if (await botVC(interaction)) return
        if (await differentVoice(interaction)) return

        const player = client.kazagumo.getPlayer(interaction.guild?.id as string)
        if (!player) return reply(interaction, "❌", "No song player was found", true)
        if (player.playing) return reply(interaction, "❌", "The player is already resumed", true)

        await interaction.deferReply()

        player.pause(false)

        return editReply(interaction, "▶", "**Resumed** the player")
    }
})