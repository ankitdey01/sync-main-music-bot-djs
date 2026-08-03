import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { SlashCommand, memberVoice, botVC, differentVoice, msToTimestamp, reply } from "../../structure/index.js";
import { getBackgroundAttachment, getBackgroundAttachmentUrl } from "../../utils/imageUtils.js";

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('grab')
        .setDescription('Get the current playing song info in your DMs'),
    category: "Music",
    async execute(interaction, client) {

        if (await botVC(interaction)) return
        if (await memberVoice(interaction)) return
        if (await differentVoice(interaction)) return

        const player = client.kazagumo.getPlayer(interaction.guild?.id as string)
        if (!player) return reply(interaction, "❌", "No song player was found", true)
        if (!player.queue.current) return reply(interaction, "❌", "No song was found playing", true)

        const track = player.queue.current
        const link = `https://www.google.com/search?q=${encodeURIComponent(track.title)}`

        const Embed = new EmbedBuilder()
            .setColor(client.color)
            .setAuthor({ 
                name: "Grabbed your current song | Sync Music", 
                iconURL: (track.requester as any)?.displayAvatarURL?.() || client.user?.displayAvatarURL() 
            })
            .setDescription(`[\`\`${track.title}\`\`](${link})`)
            .addFields(
                { name: 'Requested by', value: `<@${(track.requester as any)?.id || 'Unknown'}>`, inline: true },
                { name: 'Song by', value: `\`${track.author}\``, inline: true },
                { name: 'Duration', value: `\`❯ ${msToTimestamp(track.length as number)}\``, inline: true },
            )
            .setImage(track.thumbnail || getBackgroundAttachmentUrl())

        const backgroundAttachment = track.thumbnail ? null : getBackgroundAttachment();

        try {
            await interaction.user.send({ embeds: [Embed], files: track.thumbnail ? [] : (backgroundAttachment ? [backgroundAttachment] : []) })
            return reply(interaction, "✅", "Grabbed current song. Check your DMs!")
        } catch {
            return reply(interaction, "❌", "I couldn't send you a DM. Please check your privacy settings.", true)
        }
    }
});
