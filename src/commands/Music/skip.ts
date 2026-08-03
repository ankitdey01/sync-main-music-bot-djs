import { SlashCommandBuilder } from "discord.js";
import { SlashCommand, memberVoice, botVC, differentVoice, reply, editReply } from "../../structure/index.js";

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current track'),
    category: "Music",
    async execute(interaction, client) {

        if (await memberVoice(interaction)) return
        if (await botVC(interaction)) return
        if (await differentVoice(interaction)) return

        const player = client.kazagumo.getPlayer(interaction.guild?.id as string)
        if (!player) return reply(interaction, "❌", "No song player was found", true)

        await interaction.deferReply()
        player.skip()

        return editReply(interaction, "⏭", "**Skipped** the current track")
    }
})