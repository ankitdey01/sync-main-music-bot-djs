import { SlashCommand } from "../../structure/index.js";
import { EmbedBuilder, ButtonBuilder, SlashCommandBuilder, ButtonStyle, ActionRowBuilder } from "discord.js";

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName("vote")
        .setDescription("Vote me on top.gg"),
    category: "General",
    execute(interaction, client) {

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(client.color)
                    .setTitle(`Vote Me`)
                    .setThumbnail(`${client.user?.displayAvatarURL()}`)
                    .setDescription(`Sync Music **top.gg** Vote\n\n**[Click Here](${client.data.topgg.vote})**`)
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setLabel("Vote Me")
                        .setStyle(ButtonStyle.Link)
                        .setURL(client.data.topgg.vote),
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Link)
                        .setURL(`${client.data.links.support}`)
                        .setLabel("Support Server")
                )
            ]
        })
    }
})