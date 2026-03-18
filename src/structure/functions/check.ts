import { EmbedBuilder, ChannelType, ChatInputCommandInteraction, GuildMember, InteractionResponse, ButtonInteraction, StringSelectMenuInteraction, ModalSubmitInteraction, AnySelectMenuInteraction, MessageFlags } from "discord.js";

type ValidInteraction = ChatInputCommandInteraction | ButtonInteraction | AnySelectMenuInteraction | ModalSubmitInteraction

export async function joinable(interaction: ValidInteraction): Promise<boolean | InteractionResponse<boolean>> {

    if (!(interaction.member as GuildMember).voice.channel?.joinable) {
        if (interaction.replied || interaction.deferred) {
            console.warn('Attempted to reply in joinable check to already handled interaction');
            return true;
        }
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor("DarkRed")
                .setDescription("I do not have permission to join your voice channel!")],
            flags: MessageFlags.Ephemeral
        }).catch(() => true);
    }

    else return false

}

export async function memberVoice(interaction: ValidInteraction): Promise<boolean | InteractionResponse<boolean>>  {

    if (!(interaction.member as GuildMember)?.voice.channel) {
        if (interaction.replied || interaction.deferred) {
            console.warn('Attempted to reply in memberVoice check to already handled interaction');
            return true;
        }
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor("DarkRed")
                .setDescription("You need to join a voice channel")],
            flags: MessageFlags.Ephemeral
        }).catch(() => true);
    }

    else return false

}

export async function differentVoice(interaction: ValidInteraction): Promise<boolean | InteractionResponse<boolean>>  {

    if (interaction.guild?.members.me?.voice.channel && (interaction.member as GuildMember)?.voice.channel?.id !== interaction.guild.members.me.voice.channelId) {
        if (interaction.replied || interaction.deferred) {
            console.warn('Attempted to reply in differentVoice check to already handled interaction');
            return true;
        }
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor("DarkRed")
                .setDescription(`I am already playing music in <#${interaction.guild.members.me.voice.channelId}>`)],
            flags: MessageFlags.Ephemeral
        }).catch(() => true);
    }

    else return false

}

export async function botVC(interaction: ValidInteraction): Promise<boolean | InteractionResponse<boolean>>  {

    if (!interaction.guild?.members.me?.voice.channel) {
        if (interaction.replied || interaction.deferred) {
            console.warn('Attempted to reply in botVC check to already handled interaction');
            return true;
        }
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor("DarkRed")
                .setDescription("I'm not connected to any voice channel")],
            flags: MessageFlags.Ephemeral
        }).catch(() => true);
    }

    else return false

}

export async function stageCheck(interaction: ValidInteraction): Promise<boolean | InteractionResponse<boolean>>  {

    if ((interaction.member as GuildMember)?.voice.channel?.type == ChannelType.GuildStageVoice) {
        if (interaction.replied || interaction.deferred) {
            console.warn('Attempted to reply in stageCheck to already handled interaction');
            return true;
        }
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor("DarkRed")
                .setDescription("Playing on Stage isn't supported yet")],
            flags: MessageFlags.Ephemeral
        }).catch(() => true);
    }

    else return false

}