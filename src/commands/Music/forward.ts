import { SlashCommandBuilder } from "discord.js";
import { SlashCommand, botVC, memberVoice, differentVoice, reply, editReply } from "../../structure";

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('forward')
        .setDescription('Skip a certain amount of seconds forward')
        .addIntegerOption(opt =>
            opt.setName('seconds')
                .setDescription('Enter the amount of seconds to seek forward')
                .setRequired(true)
                .setMinValue(1).setMaxValue(360)
        ),
    category: "Music",
    async execute(interaction, client) {

        if (await botVC(interaction)) return
        if (await memberVoice(interaction)) return
        if (await differentVoice(interaction)) return

        const player = client.kazagumo.getPlayer(interaction.guild?.id as string)
        if (!player) return reply(interaction, "❌", "No song player was found", true)

        if (!player.playing || !player.queue.current) return reply(interaction, "❌", "No song was found playing", true)

        await interaction.deferReply()

        const forwardAmount = interaction.options.getInteger("seconds")
        let seektime = Number(player.position) + Number(forwardAmount) * 1000
        if (Number(forwardAmount) <= 0) seektime = Number(player.position)
        if (Number(seektime) >= (player.queue.current.length as number)) seektime = player.queue.current.length as number - 1000

        player.seek(Number(seektime))

        return editReply(interaction, "⏩", `Skipped **${forwardAmount}** seconds forward`)
    }
})