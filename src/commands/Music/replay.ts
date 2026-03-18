import { SlashCommandBuilder } from "discord.js";
import { SlashCommand, memberVoice, botVC, differentVoice, joinable, stageCheck, reply, editReply } from "../../structure";

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('replay')
        .setDescription('Replay the current song'),
    category: "Music",
    async execute(interaction, client) {

        if (await botVC(interaction)) return
        if (await memberVoice(interaction)) return
        if (await differentVoice(interaction)) return
        if (await stageCheck(interaction)) return
        if (await joinable(interaction)) return

        const player = client.kazagumo.getPlayer(interaction.guild?.id as string)
        if (!player) return reply(interaction, "❌", "No song player was found", true)
        if (!player.playing || !player.paused) return reply(interaction, "❌", "No song was found playing", true)

        await interaction.deferReply()

        player.seek(0)
        player.pause(false)

        return editReply(interaction, "🔁", "**Replaying** the current song")
    }
})