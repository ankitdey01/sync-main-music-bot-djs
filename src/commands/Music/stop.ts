import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { SlashCommand, memberVoice, botVC, differentVoice, musicSetupUpdate, reply, editReply } from "../../structure/index.js";
import { clearChannelButtons } from "../../systems/button.js";
import { getBackgroundAttachmentUrl } from "../../utils/imageUtils.js";

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the current track'),
    category: "Music",
    async execute(interaction, client) {

        if (await memberVoice(interaction)) return
        if (await botVC(interaction)) return
        if (await differentVoice(interaction)) return

        const player = client.kazagumo.getPlayer(interaction.guild?.id as string)
        if (!player) return reply(interaction, "❌", "No song player was found", true)

        await interaction.deferReply()

        await clearChannelButtons(client, player.guildId, player.textId as string)

        if (player.state == 1) player.disconnect()
        player.destroy()

        const setupUpdateEmbed = new EmbedBuilder()
            .setColor(client.color)
            .setTitle(`No song playing currently`)
            .setImage(getBackgroundAttachmentUrl())
            .setDescription(
                `**[Invite Me](${client.data.links.invite})  :  [Support Server](${client.data.links.support})  :  [Vote Me](${client.data.topgg.vote})**`
            )
        await musicSetupUpdate(client, player, setupUpdateEmbed)

        return editReply(interaction, "⏹", "Stopped the player")
    }
})