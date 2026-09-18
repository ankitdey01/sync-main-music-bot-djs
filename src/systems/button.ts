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
 * Disable the buttons on a guild's active NOW PLAYING message(s) and remove
 * their tracking documents. Sweeps the whole guild - not just the current
 * channel - so orphaned button docs (e.g. left behind when a cleanup was
 * skipped) are disabled too and can never survive into the next session.
 * Safe to call when there is nothing to clean.
 */
export async function clearChannelButtons(client: CustomClient, guildId: string, textId: string): Promise<void> {
    const data = await buttonDB.find<TempButtonSchema>({ Guild: guildId }).catch(() => []);
    if (!data.length) return;

    // Group leftovers per channel; the current channel goes first so it is
    // always cleaned even if a later channel fetch misbehaves.
    const byChannel = new Map<string, TempButtonSchema[]>();
    for (const doc of data) {
        const list = byChannel.get(doc.Channel) ?? [];
        list.push(doc);
        byChannel.set(doc.Channel, list);
    }

    const channelIds = [textId, ...[...byChannel.keys()].filter((id) => id !== textId)]
        .filter((id) => byChannel.has(id));

    for (const channelId of channelIds) {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (channel && channel.isTextBased()) {
            for (const doc of byChannel.get(channelId) ?? []) {
                const msg = await channel.messages.fetch(doc.MessageID).catch(() => null);
                if (msg && msg.editable) await msg.edit({ components: [buttonDisable] }).catch(() => { });
            }
        }
    }

    // Remove the tracking docs even when channels/messages are gone
    await buttonDB.deleteMany({ Guild: guildId }).catch(() => { });
}

export { buttonDisable, buttonEnable, panelbutton }