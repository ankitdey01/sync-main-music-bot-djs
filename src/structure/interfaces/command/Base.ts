import { ChatInputCommandInteraction, SharedNameAndDescription, SlashCommandBuilder, AutocompleteInteraction } from "discord.js";
import { CustomClient } from "../../classes/index.js";

export interface BaseApplicationCommand {
    data: SlashCommandBuilder | SharedNameAndDescription;
    category: "Filter" | "General" | "Music" | "Others" | "Playlist";
    botOwnerOnly?: boolean;
    voteOnly?: boolean;
    execute(interaction: ChatInputCommandInteraction, client: CustomClient): any;
    autocomplete?(interaction: AutocompleteInteraction, client: CustomClient): any;
}
