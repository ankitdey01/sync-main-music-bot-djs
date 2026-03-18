import { AnySelectMenuInteraction, ButtonInteraction, ChatInputCommandInteraction, Colors, EmbedBuilder, MessageFlags, ModalSubmitInteraction } from "discord.js";
import client from "../../index.js";

export type ValidInteractionTypes =
    ChatInputCommandInteraction |
    ButtonInteraction |
    AnySelectMenuInteraction |
    ModalSubmitInteraction;

export async function reply(interaction: ValidInteractionTypes, emoji: string, description: string, ephemeral: boolean = false) {
    // Check if interaction can still be replied to
    if (interaction.replied || interaction.deferred) {
        console.warn('Attempted to reply to an already handled interaction');
        return Promise.resolve();
    }

    return interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(emoji === "❌" ? Colors.DarkRed : client.color)
                .setDescription(`\`${emoji}\` | **${description}**`)
        ],
        ...(ephemeral ? { flags: MessageFlags.Ephemeral } : {})
    }).catch((error) => {
        console.error('Failed to reply to interaction:', error);
        // Don't throw the error to prevent unhandled promise rejections
    });
}