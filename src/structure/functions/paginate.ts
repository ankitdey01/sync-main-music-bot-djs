import { ActionRowBuilder, AnySelectMenuInteraction, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, ComponentType, EmbedBuilder, ModalSubmitInteraction } from "discord.js";
import { reply } from "./index.js";

type ValidInteraction = ChatInputCommandInteraction | ButtonInteraction | ModalSubmitInteraction | AnySelectMenuInteraction

export async function paginate(interaction: ValidInteraction, embeds: EmbedBuilder[]) {
    await interaction.deferReply();

    const previousPage = "<:white_hard_left:1062415226219266068>";
    const nextPage = "<:white_hard_right:1062415230971424808>";
    const closePage = "<:whitecross:1026545632686653550>"
    const firstPage = "<:white_left:1062415235241222154>";
    const lastPage = "<:white_right:1062415239020302437>";

    const buttons = [
        new ButtonBuilder()
            .setCustomId("pagination-firstPage")
            .setEmoji(firstPage)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId("pagination-previousPage")
            .setEmoji(previousPage)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId("pagination-closePage")
            .setEmoji(closePage)
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId("pagination-nextPage")
            .setEmoji(nextPage)
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId("pagination-lastPage")
            .setEmoji(lastPage)
            .setStyle(ButtonStyle.Primary)
    ];

    // Set initial button states
    if (embeds.length === 1) {
        buttons[0].setDisabled(true); // First page
        buttons[1].setDisabled(true); // Previous page  
        buttons[3].setDisabled(true); // Next page
        buttons[4].setDisabled(true); // Last page
    }

    const row = new ActionRowBuilder<ButtonBuilder>().setComponents(...buttons);

    let currentPage: number = 0;
    const message = await interaction.editReply({ embeds: [embeds[currentPage]], components: [row] });

    const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60 * 1000 * 5 });

    collector.on("collect", (i) => {
        if (i.user.id !== interaction.user.id) return reply(i, "❌", "This is not your message");

        switch (i.customId) {
            case "pagination-firstPage": {
                currentPage = 0;
                break;
            }

            case "pagination-previousPage": {
                currentPage--;
                break;
            }

            case "pagination-closePage": {
                buttons[0].setDisabled(true);
                buttons[1].setDisabled(true);
                buttons[2].setDisabled(true);
                buttons[3].setDisabled(true);
                buttons[4].setDisabled(true);
                
                const closedRow = new ActionRowBuilder<ButtonBuilder>().setComponents(buttons);
                i.deferUpdate();
                message.edit({ components: [closedRow] });
                collector.stop();
                return;
            }

            case "pagination-nextPage": {
                currentPage++;
                break;
            }

            case "pagination-lastPage": {
                currentPage = embeds.length - 1;
                break;
            }
        }

        // Handle single page case
        if (embeds.length === 1) {
            buttons[0].setDisabled(true); // First page
            buttons[1].setDisabled(true); // Previous page  
            buttons[3].setDisabled(true); // Next page
            buttons[4].setDisabled(true); // Last page
        } else {
            switch (currentPage) {
                case 0: {
                    buttons[0].setDisabled(true);  // First page
                    buttons[1].setDisabled(true);  // Previous page
                    buttons[3].setDisabled(false); // Next page
                    buttons[4].setDisabled(false); // Last page
                    break;
                }

                case embeds.length - 1: {
                    buttons[0].setDisabled(false); // First page
                    buttons[1].setDisabled(false); // Previous page
                    buttons[3].setDisabled(true);  // Next page
                    buttons[4].setDisabled(true);  // Last page
                    break;
                }

                default: {
                    // Middle pages - enable all navigation buttons
                    buttons[0].setDisabled(false); // First page
                    buttons[1].setDisabled(false); // Previous page
                    buttons[3].setDisabled(false); // Next page
                    buttons[4].setDisabled(false); // Last page
                    break;
                }
            }
        }

        const newRow = new ActionRowBuilder<ButtonBuilder>().setComponents(buttons);

        i.deferUpdate();
        message.edit({ embeds: [embeds[currentPage]], components: [newRow] });
    });

    collector.on("end", () => {

        buttons[0].setDisabled(true);
        buttons[1].setDisabled(true);
        buttons[2].setDisabled(true);
        buttons[3].setDisabled(true);
        buttons[4].setDisabled(true);

        const endRow = new ActionRowBuilder<ButtonBuilder>().setComponents(buttons)
        message.edit({ components: [endRow] });
    });
}