import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import type { CustomClient } from "../structure/index.js";
import buttonDB, { TempButtonSchema } from "../schemas/tempbutton.js";
import emoji from "./emojis.js";

const buttonDisable = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
        .setCustomId("vol-down")
        .setEmoji(emoji.button.voldown)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),

    new ButtonBuilder()
        .setCustomId("pause-resume-song")
        .setEmoji(emoji.button.pauseresume)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),

    new ButtonBuilder()
        .setCustomId("stop-song")
        .setEmoji(emoji.button.stop)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),

    new ButtonBuilder()
        .setCustomId("skip-song")
        .setEmoji(emoji.button.skip)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),

    new ButtonBuilder()
        .setCustomId("vol-up")
        .setEmoji(emoji.button.volup)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
)

const buttonEnable = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
        .setCustomId("vol-down")
        .setEmoji(emoji.button.voldown)
        .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
        .setCustomId("pause-resume-song")
        .setEmoji(emoji.button.pauseresume)
        .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
        .setCustomId("stop-song")
        .setEmoji(emoji.button.stop)
        .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
        .setCustomId("skip-song")
        .setEmoji(emoji.button.skip)
        .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
        .setCustomId("vol-up")
        .setEmoji(emoji.button.volup)
        .setStyle(ButtonStyle.Secondary),

)

const panelbutton = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
        .setCustomId("vol-down")
        .setEmoji(emoji.button.voldown)
        .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
        .setCustomId("pause-resume-song")
        .setEmoji(emoji.button.pauseresume)
        .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
        .setCustomId("search-song")
        .setEmoji(emoji.button.play)
        .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
        .setCustomId("stop-song")
        .setEmoji(emoji.button.stop)
        .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
        .setCustomId("vol-up")
        .setEmoji(emoji.button.volup)
        .setStyle(ButtonStyle.Secondary),

)

/**
 * Disable the buttons on a channel's active NOW PLAYING message(s) and remove
 * their tracking documents. Safe to call when there is nothing to clean.
 */
export async function clearChannelButtons(client: CustomClient, guildId: string, textId: string): Promise<void> {
    const data = await buttonDB.find<TempButtonSchema>({ Guild: guildId, Channel: textId }).catch(() => []);
    if (!data.length) return;

    const channel = await client.channels.fetch(textId).catch(() => null);
    if (channel && channel.isTextBased()) {
        for (const doc of data) {
            const msg = await channel.messages.fetch(doc.MessageID).catch(() => null);
            if (msg && msg.editable) await msg.edit({ components: [buttonDisable] }).catch(() => { });
        }
    }

    // Remove the tracking docs even when the channel itself is gone
    await buttonDB.deleteMany({ Guild: guildId, Channel: textId }).catch(() => { });
}

export { buttonDisable, buttonEnable, panelbutton }