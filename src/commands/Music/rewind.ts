import { SlashCommandBuilder } from "discord.js";
import { SlashCommand, memberVoice, botVC, differentVoice, reply, editReply } from "../../structure/index.js";

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('rewind')
        .setDescription('Rewind a certain amount of seconds backwards')
        .addIntegerOption(opt =>
            opt.setName('seconds')
                .setDescription('Enter the amount of seconds to rewind')
                .setRequired(true)
                .setMinValue(1).setMaxValue(360)
        ),
        category: "Music",
    async execute(interaction, client) {

        if (await memberVoice(interaction)) return
        if (await botVC(interaction)) return
        if (await differentVoice(interaction)) return

        const player = client.kazagumo.getPlayer(interaction.guild?.id as string)
        if (!player) return reply(interaction, "❌", "No song player was found", true)
        if (!player.queue.current) return reply(interaction, "❌", "No song was found playing", true)

        const rewindAmount = interaction.options.getInteger("seconds", true)
        let seektime = player.position - rewindAmount * 1000

        await interaction.deferReply()

        if ( seektime >= (player.queue.current.length as number) - player.position || seektime < 0) seektime = 0
        player.seek(seektime)

        return editReply(interaction, "⏪", `Rewinded **${rewindAmount}** seconds backward`)
    },
})