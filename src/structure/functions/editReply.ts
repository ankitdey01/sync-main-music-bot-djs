import { Colors, EmbedBuilder } from "discord.js";
import { ValidInteractionTypes } from "./reply.js";
import client from "../../index.js";

export async function editReply(interaction: ValidInteractionTypes, emoji: string, description: string) {
    // Check if interaction can be edited
    if (!interaction.deferred && !interaction.replied) {
        console.warn('Attempted to edit reply on an interaction that was not deferred or replied to');
        return Promise.resolve();
    }

    return interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setColor(emoji === "❌" ? Colors.DarkRed : client.color)
                .setDescription(`\`${emoji}\` | **${description}**`)
        ]
    }).catch((error) => {
        console.error('Failed to edit interaction reply:', error);
        // Don't throw the error to prevent unhandled promise rejections
    });
}