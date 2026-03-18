import { SlashCommandBuilder } from "discord.js";
import { SlashCommand, memberVoice, differentVoice, botVC, reply, editReply } from "../../structure/index.js";

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('clearqueue')
        .setDescription('Clears the queue'),
    category: "Music",
    async execute(interaction, client) {

        if (await memberVoice(interaction)) return
        if (await differentVoice(interaction)) return
        if (await botVC(interaction)) return

        const player = client.kazagumo.getPlayer(interaction.guild?.id as string)
        if (!player) return reply(interaction, "❌", "No song player was found", true)

        await interaction.deferReply()

        player.queue.clear()

        return editReply(interaction, "🧹", "The queue has been **cleared**")
    }
})