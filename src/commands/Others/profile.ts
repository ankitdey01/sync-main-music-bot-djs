import { EmbedBuilder, AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import db, { PlayedSchema } from "../../schemas/played.js";
import { profileImage } from "discord-arts";
import pms from "pretty-ms";
import { SlashCommand } from "../../structure/index.js";

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName("profile")
        .setDescription("Check your Sync profile"),
    category: "Others",
    voteOnly: true,
    async execute(interaction, client) {

        // Check if interaction hasn't been handled yet before deferring
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferReply()
        }

        const data = await db.findOne<PlayedSchema>({ User: interaction.user.id })

        // Only try to edit reply if the interaction was properly deferred or replied to
        if (interaction.deferred || interaction.replied) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(client.color)
                        .setImage("attachment://profile.png")
                        .setDescription(
                            `**Songs Played - ${data ? data.Played : 0} | Listened for - ${data ? pms(data.Time, { verbose: true }) : 0}**`
                        )
                ],
                files: [
                    new AttachmentBuilder(
                        await profileImage(interaction.user.id, {
                            customTag: 'Keep Syncing',
                            customBackground: 'src/assets/profile.png',
                            overwriteBadges: true,
                            borderColor: [client.color as string],
                            presenceStatus: 'dnd'
                        }),
                        { name: 'profile.png' },
                    )
                ]
            }).catch((error) => {
                console.error('Failed to edit reply in profile command:', error);
            })
        } else {
            console.warn('Profile command: Interaction was not properly deferred or replied to');
        }

    }
})