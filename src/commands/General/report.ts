import { SlashCommandBuilder, EmbedBuilder, BaseGuildTextChannel, MessageFlags } from "discord.js"
import { editReply, log, SlashCommand } from "../../structure/index.js"

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName("report")
        .setDescription("Report any issues you are facing with the bot")
        .addStringOption(opt =>
            opt.setName('description')
                .setDescription('Explain in few words about your report')
                .setRequired(true)
        ),
    category: "General",
    async execute(interaction, client) {

        await interaction.deferReply({ flags: MessageFlags.Ephemeral })
        editReply(interaction, "✅", `Thanks for reporting! The report is now submitted and will review shortly.`)

        const Embed = new EmbedBuilder()
            .setColor(client.color)
            .setTitle(`Reported by ${interaction.user.username}`)
            .addFields(
                { name: `Guild`, value: `${interaction.guild?.name} (${interaction.guild?.id})` },
                { name: `User`, value: `${interaction.user.username} (${interaction.user.id})` },
            )
            .setDescription(`**Report: ${interaction.options.getString('description', true)}**`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp()

        log(client,
            Embed,
            client.data.devBotEnabled ? client.data.dev.log.error : client.data.prod.log.error
        )
    }
})