import { EmbedBuilder } from "discord.js";
import { KazagumoPlayer } from "kazagumo";
import { CustomClient } from "../index.js";
import setupDB, { MusicChannelDocument } from "../../schemas/musicchannel.js";

// Setup documents only change when /setup create/delete runs, so the cache is
// kept indefinitely per guild and invalidated by setup.ts on writes.
// Steady-state cost for a playing guild: zero MongoDB queries.
// Keyed by guild (not text channel) so the panel reflects the guild's player
// regardless of which channel /play was used in.
const setupCache = new Map<string, MusicChannelDocument | null>();

export async function getMusicChannelSetup(guildId: string): Promise<MusicChannelDocument | null> {
    if (setupCache.has(guildId)) return setupCache.get(guildId)!;

    const doc = await setupDB.findOne<MusicChannelDocument>({ Guild: guildId }).catch(() => null);
    setupCache.set(guildId, doc);
    return doc;
}

/** Called by setup.ts after creating/deleting a setup doc. */
export function invalidateMusicChannelSetup(guildId: string): void {
    setupCache.delete(guildId);
}

export async function musicSetupUpdate(client: CustomClient, player: KazagumoPlayer, embed: EmbedBuilder): Promise<void> {
    const data = await getMusicChannelSetup(player.guildId);
    if (!data) return;

    const channel = await client.channels.fetch(data.Channel).catch((err) => {
        // Unknown Channel (10003): the setup channel was deleted manually.
        // Self-clean so /setup create can run again without /setup delete first.
        if (err?.code === 10003) {
            setupDB.deleteOne({ Guild: player.guildId }).catch(() => { });
            invalidateMusicChannelSetup(player.guildId);
        }
        return null;
    });
    if (!channel || !channel.isTextBased()) return;

    const message = await channel.messages.fetch(data.Message).catch(() => null);
    if (!message || !message.editable) return;

    await message.edit({ embeds: [embed] }).catch(() => { });
}
