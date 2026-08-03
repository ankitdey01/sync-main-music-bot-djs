import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import {
  SlashCommand,
  botVC,
  memberVoice,
  differentVoice,
  msToTimestamp,
  reply,
} from "../../structure/index.js";
import { KazagumoTrack } from "kazagumo";
import { getBackgroundAttachment, getBackgroundAttachmentUrl } from "../../utils/imageUtils.js";

export default new SlashCommand({
  data: new SlashCommandBuilder()
    .setName("now-playing")
    .setDescription("Get the current playing song"),
  category: "Music",
  async execute(interaction, client) {
    if (await botVC(interaction)) return;
    if (await memberVoice(interaction)) return;
    if (await differentVoice(interaction)) return;

    const player = client.kazagumo.getPlayer(interaction.guild?.id as string);
    if (!player)
      return reply(interaction, "❌", "No song player was found", true);
    if (!player.queue.current)
      return reply(interaction, "❌", "No song was found playing", true);

    await interaction.deferReply();

    const track = player.queue.current as KazagumoTrack;
    const link = `https://www.google.com/search?q=${encodeURIComponent(track.title)}`;

    const Embed = new EmbedBuilder()
      .setColor(client.color)
      .setAuthor({
        name: "NOW PLAYING",
        iconURL:
          (track.requester as any)?.displayAvatarURL?.() ||
          client.user?.displayAvatarURL(),
      })
      .setDescription(`[\`\`${track.title}\`\`](${link})`)
      .addFields(
        {
          name: "Requested by",
          value: `<@${(track.requester as any)?.id || "Unknown"}>`,
          inline: true,
        },
        { name: "Song by", value: `\`${track.author}\``, inline: true },
        {
          name: "Duration",
          value: `\`❯ ${msToTimestamp(track.length as number)}\``,
          inline: true,
        },
      )
      .setImage(track.thumbnail || getBackgroundAttachmentUrl());

    const backgroundAttachment = track.thumbnail
      ? null
      : getBackgroundAttachment();
    const files = backgroundAttachment ? [backgroundAttachment] : [];

    return interaction.editReply({ embeds: [Embed], files: track.thumbnail ? [] : (backgroundAttachment ? [backgroundAttachment] : []) });
  },
});
