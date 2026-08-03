import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { SlashCommand, memberVoice, botVC, differentVoice, reply } from "../../structure/index.js";

export default new SlashCommand({

    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('View the queue'),
    category: "Music",
    voteOnly: true,
    async execute(interaction, client) {

        if (await memberVoice(interaction)) return
        if (await botVC(interaction)) return  
        if (await differentVoice(interaction)) return

        const player = client.kazagumo.getPlayer(interaction.guild?.id as string)
        if (!player) return reply(interaction, "❌", "No song player was found", true)
        if (!player.queue?.length) return reply(interaction, "❌", "There is nothing in the queue", true)

        // Defer the reply only if no checks have failed (meaning we haven't replied yet)
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferReply()
        }

        const queue = player.queue.map(
            (t, i) => `\`${++i}.\` [\`${t.title}\`](https://google.com/search?q=${encodeURIComponent(t.title)}) | ${t.requester}`
        )
        const util = class Util {
            static chunk(arr: string[], size: number) {
                const temp = [];
                for (let i = 0; i < arr.length; i += size) {
                    temp.push(arr.slice(i, i + size))
                }
                return temp
            }
        }

        const chunked = util.chunk(queue, 10).map((x) => x.join("\n"))
        const Embed = new EmbedBuilder()
            .setColor(client.color)
            .setAuthor({ name: `${interaction.guild?.name}'s Queue`, iconURL: interaction.guild?.iconURL() as string })
            .setDescription(chunked[0])
            .setTimestamp()

        return interaction.editReply({
            embeds: [Embed],
        })
    }
})
