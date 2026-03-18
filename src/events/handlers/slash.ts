import { ChatInputCommandInteraction, Events, InteractionType, EmbedBuilder } from "discord.js";
import { Event, CustomClient, reply } from "../../structure/index.js";
import { log } from "../../structure/index.js";
import { Api } from '@top-gg/sdk'

function getDiscordApiErrorCode(error: unknown): number | undefined {
    if (!error || typeof error !== "object" || !("code" in error)) return undefined;

    const code = (error as { code?: unknown }).code;
    return typeof code === "number" ? code : undefined;
}

export default new Event({
    name: Events.InteractionCreate,
    async execute(interaction: ChatInputCommandInteraction, client: CustomClient) {
        if (interaction.type !== InteractionType.ApplicationCommand) return;
        
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            if (!interaction.replied && !interaction.deferred) {
                await reply(interaction, "❌", "This command does not exist").catch(() => {});
            }
            return client.commands.delete(interaction.commandName)
        }

        // Check bot owner only
        if (command.botOwnerOnly && !client.data.developers.includes(interaction.user.id)) {
            if (!interaction.replied && !interaction.deferred) {
                return reply(interaction, "❌", "This command is only available for bot developers").catch(() => {});
            }
            return;
        }

        // Check vote only
        if (command.voteOnly) {
            try {
                const hasVoted = await new Api(client.data.topgg.token).hasVoted(interaction.user.id);
                if (!hasVoted) {
                    if (!interaction.replied && !interaction.deferred) {
                        return reply(interaction, "❌", `You must vote me on [top.gg](${client.data.topgg.vote}) to use this command`).catch(() => {});
                    }
                    return;
                }
            } catch (error) {
                console.error('Top.gg API error:', error);
                // Continue execution if Top.gg API fails
            }
        }

        // Execute command with error handling
        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error('Command execution error:', error);

            const errorCode = getDiscordApiErrorCode(error);

            // Discord already rejected or acknowledged this interaction, so avoid a second response attempt.
            if (errorCode === 10062 || errorCode === 40060) {
                return;
            }
            
            // Only try to respond if we haven't already
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setColor("DarkRed")
                            .setDescription("❌ | An error occurred while executing this command")
                        ]
                    });
                } catch (replyError) {
                    const replyCode = getDiscordApiErrorCode(replyError);
                    if (replyCode !== 10062 && replyCode !== 40060) {
                        console.error('Failed to send error message:', replyError);
                    }
                }
            } else {
                try {
                    await interaction.editReply({
                        embeds: [new EmbedBuilder()
                            .setColor("DarkRed")
                            .setDescription("❌ | An error occurred while executing this command")
                        ]
                    });
                } catch (editError) {
                    const editCode = getDiscordApiErrorCode(editError);
                    if (editCode !== 10062 && editCode !== 40060) {
                        console.error('Failed to edit reply with error message:', editError);
                    }
                }
            }
        }

        // Log command usage (only if interaction exists and is still valid)
        if (!interaction.replied && !interaction.deferred) {
            try {
                const Embed = new EmbedBuilder()
                    .setColor("DarkBlue")
                    .setAuthor({ name: `${interaction.guild?.name}`, iconURL: interaction.guild?.iconURL() || client.user?.displayAvatarURL() })
                    .setDescription(`\`\`\`Used In: ${interaction.guild?.name} (${interaction.guild?.id})\
            \nCommand Used: ${interaction.commandName} (${interaction.commandId})\
            \nUsed by: ${interaction.user.username} (${interaction.user.id})\`\`\``)

                log(client, Embed, client.data.devBotEnabled ? client.data.dev.webhook.command : client.data.prod.webhook.command);
            } catch (logError) {
                console.error('Failed to log command usage:', logError);
            }
        }
    }
});