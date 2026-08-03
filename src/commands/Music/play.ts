import { GuildMember, SlashCommandBuilder } from "discord.js"
import { SlashCommand, playSong, memberVoice, joinable, differentVoice, stageCheck, reply, editReply } from "../../structure/index.js"

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song')
        .addStringOption(opt =>
            opt.setName('query')
                .setDescription('Enter a song name to play')
                .setRequired(true)
                .setAutocomplete(true)
        ),
    category: "Music",
    async execute(interaction, client) {

        if (await memberVoice(interaction)) return
        if (await joinable(interaction)) return
        if (await differentVoice(interaction)) return
        if (await stageCheck(interaction)) return

        await interaction.deferReply()

        const query = interaction.options.getString("query", true)

        const voiceChannelId = (interaction.member as GuildMember)?.voice?.channel?.id;
        if (!voiceChannelId) return;

        const player = await client.kazagumo.createPlayer({
            guildId: interaction.guild?.id as string,
            voiceId: voiceChannelId,
            textId: interaction.channel?.id as string,
            deaf: true
        })

        playSong(interaction, client, player, query)

    }
})