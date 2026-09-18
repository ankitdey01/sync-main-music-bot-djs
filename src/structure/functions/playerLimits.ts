import { EmbedBuilder } from "discord.js";
import { KazagumoPlayer } from "kazagumo";
import { CustomClient } from "../classes/index.js";
import { msToTimestamp } from "./mstotimestamp.js";

const TIMERS_KEY = "limitTimers";

// Schedules the 2h (solo) and 3h (absolute max) checkpoints for a player.
// Warnings fire warningBeforeMs ahead of each checkpoint.
export function schedulePlayerLimits(client: CustomClient, player: KazagumoPlayer): void {
    clearPlayerLimits(player);

    const { soloMaxMs, multiMaxMs, warningBeforeMs } = client.data.playerLimits;
    const timers: NodeJS.Timeout[] = [];
    const at = (ms: number, fn: () => Promise<void>) => {
        timers.push(setTimeout(() => void fn(), Math.max(ms, 0)));
    };

    at(soloMaxMs - warningBeforeMs, () => sendSoloWarning(client, player));
    at(soloMaxMs, () => enforceSoloCheckpoint(client, player));
    at(multiMaxMs - warningBeforeMs, () => sendFinalWarning(client, player));
    at(multiMaxMs, () => enforceFinalCheckpoint(client, player));

    player.data.set(TIMERS_KEY, timers);
}

// Cancels all pending limit timers for a player. Safe to call repeatedly.
export function clearPlayerLimits(player: KazagumoPlayer): void {
    const timers = player.data.get(TIMERS_KEY) as NodeJS.Timeout[] | undefined;
    if (timers) timers.forEach((timer) => clearTimeout(timer));
    player.data.delete(TIMERS_KEY);
}

// Non-bot members currently in the player's voice channel.
// Null when the channel can't be resolved (treated as solo by callers).
function listenerCount(client: CustomClient, player: KazagumoPlayer): number | null {
    const guild = client.guilds.cache.get(player.guildId);
    const voiceChannel = player.voiceId ? guild?.channels.cache.get(player.voiceId) : undefined;
    if (!voiceChannel || !voiceChannel.isVoiceBased()) return null;
    return voiceChannel.members.filter((member) => !member.user.bot).size;
}

// Skip checkpoints for players that are already gone (e.g. destroyed early
// without the cleanup hook running).
function isCurrentPlayer(client: CustomClient, player: KazagumoPlayer): boolean {
    return client.kazagumo.players.get(player.guildId) === player;
}

async function notifyPlayerChannel(client: CustomClient, player: KazagumoPlayer, embed: EmbedBuilder): Promise<void> {
    if (!player.textId) return;
    try {
        const channel = await client.channels.fetch(player.textId).catch(() => null);
        if (channel && channel.isTextBased() && "send" in channel) {
            await channel.send({ embeds: [embed] }).catch(() => { });
        }
    } catch { /* never break a checkpoint on a send failure */ }
}

function limitEmbed(client: CustomClient, emoji: string, description: string): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(client.color)
        .setDescription(`\`${emoji}\` | **${description}**`)
        .setTimestamp();
}

async function destroyForLimit(client: CustomClient, player: KazagumoPlayer, reason: string): Promise<void> {
    if (!isCurrentPlayer(client, player)) return;
    clearPlayerLimits(player);
    await notifyPlayerChannel(client, player, limitEmbed(client, "⏹", reason));
    await player.destroy().catch(() => { });
}

async function sendSoloWarning(client: CustomClient, player: KazagumoPlayer): Promise<void> {
    if (!isCurrentPlayer(client, player)) return;
    const listeners = listenerCount(client, player) ?? 1;
    if (listeners > 1) return;
    const { soloMaxMs, multiMaxMs, warningBeforeMs } = client.data.playerLimits;
    await notifyPlayerChannel(client, player, limitEmbed(
        client,
        "⏳",
        `Only 1 listener in voice - this player stops in ${msToTimestamp(warningBeforeMs)} ` +
        `(${msToTimestamp(soloMaxMs)} solo limit). Get someone to join and it can run up to ${msToTimestamp(multiMaxMs)}.`
    ));
}

async function enforceSoloCheckpoint(client: CustomClient, player: KazagumoPlayer): Promise<void> {
    if (!isCurrentPlayer(client, player)) return;
    const listeners = listenerCount(client, player) ?? 1;
    if (listeners > 1) return;
    await destroyForLimit(client, player, `Player stopped - ${msToTimestamp(client.data.playerLimits.soloMaxMs)} solo-listener limit reached.`);
}

async function sendFinalWarning(client: CustomClient, player: KazagumoPlayer): Promise<void> {
    if (!isCurrentPlayer(client, player)) return;
    await notifyPlayerChannel(client, player, limitEmbed(
        client,
        "⏳",
        `This player stops in ${msToTimestamp(client.data.playerLimits.warningBeforeMs)} ` +
        `(${msToTimestamp(client.data.playerLimits.multiMaxMs)} maximum session length).`
    ));
}

async function enforceFinalCheckpoint(client: CustomClient, player: KazagumoPlayer): Promise<void> {
    await destroyForLimit(client, player, `Player stopped - ${msToTimestamp(client.data.playerLimits.multiMaxMs)} maximum session length reached.`);
}
