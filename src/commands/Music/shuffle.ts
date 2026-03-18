import { SlashCommandBuilder } from "discord.js";
import { SlashCommand, memberVoice, botVC, differentVoice, reply, editReply } from "../../structure";

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the queue'),
    category: "Music",
    voteOnly: true,
    async execute(interaction, client) {

        if (await memberVoice(interaction)) return
        if (await botVC(interaction)) return
        if (await differentVoice(interaction)) return

        const player = client.kazagumo.getPlayer(interaction.guild?.id as string)
        if (!player) return reply(interaction, "❌", "No song player was found", true)
        if (!player.queue.length) return reply(interaction, "❌", "There is nothing in the queue", true)

        await interaction.deferReply()
        player.queue.shuffle()

        return editReply(interaction, "🔀", "**Shuffled** the queue")
    },
})