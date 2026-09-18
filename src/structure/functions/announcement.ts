import { randomUUID } from "node:crypto"
import { EmbedBuilder, Guild, ChannelType, PermissionsBitField, TextChannel, NewsChannel } from "discord.js"
import { CustomClient } from "../classes/index.js"
import setupDB, { MusicChannelDocument } from "../../schemas/musicchannel.js"

export interface AnnouncementPayload {
    title: string
    description: string
    thumbnail?: string
    image?: string
    footer?: string
    requestedBy: string
}

// In-memory previews awaiting confirmation in the logs channel (lost on restart)
export const announcePreviews = new Map<string, AnnouncementPayload>()

const PREVIEW_TTL_MS = 15 * 60 * 1000

// Register a preview with an expiry - an unconfirmed preview is dropped after
// 15 minutes so the map can't grow unbounded; confirming afterwards reports
// the standard "preview expired" status.
export function stageAnnouncePreview(payload: AnnouncementPayload): string {
    const id = randomUUID()
    announcePreviews.set(id, payload)
    setTimeout(() => announcePreviews.delete(id), PREVIEW_TTL_MS).unref()
    return id
}

export function buildAnnouncementEmbed(client: CustomClient, payload: AnnouncementPayload): EmbedBuilder {

    const Embed = new EmbedBuilder()
        .setColor(client.color)
        .setTitle(payload.title)
        .setDescription(payload.description)
        .setTimestamp()

    if (payload.thumbnail) Embed.setThumbnail(payload.thumbnail)
    if (payload.image) Embed.setImage(payload.image)
    if (payload.footer) Embed.setFooter({ text: payload.footer })

    return Embed
}

export function formatAnnounceList(list: string[]): string {
    if (list.length === 0) return "None"
    return list.slice(0, 50).join("\n") + (list.length > 50 ? `\n... and ${list.length - 50} more` : "")
}

export async function broadcastAnnouncement(client: CustomClient, payload: AnnouncementPayload): Promise<{ sent: string[], failed: string[] }> {

    const sent: string[] = []
    const failed: string[] = []

    const Embed = buildAnnouncementEmbed(client, payload)

    for (const [, guild] of client.guilds.cache) {

        const channel = await findAnnounceChannel(guild)

        if (!channel) {
            failed.push(`${guild.name} (\`${guild.id}\`)`)
            continue
        }

        try {
            await channel.send({ embeds: [Embed] })
            sent.push(`${guild.name} (\`${guild.id}\`) → <#${channel.id}>`)
        } catch {
            failed.push(`${guild.name} (\`${guild.id}\`)`)
        }

        // Stay well under Discord rate limits (50 req/s global, 5 req/5s per channel)
        await new Promise(resolve => setTimeout(resolve, 500))
    }

    return { sent, failed }
}

async function findAnnounceChannel(guild: Guild): Promise<TextChannel | NewsChannel | null> {

    const me = guild.members.me
    if (!me) return null

    const sendable = guild.channels.cache.filter((channel): channel is TextChannel | NewsChannel =>
        (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) &&
        channel.permissionsFor(me).has([
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.EmbedLinks
        ])
    )

    if (sendable.size === 0) return null

    // Prefer the setup channel, then the system channel, then the first channel by position.
    // A DB error is not the same as "no setup record" - fail the guild rather
    // than silently guessing a fallback channel.
    let setup: MusicChannelDocument | null
    try {
        setup = await setupDB.findOne<MusicChannelDocument>({ Guild: guild.id })
    } catch {
        return null
    }
    if (setup && sendable.has(setup.Channel)) return sendable.get(setup.Channel) as TextChannel | NewsChannel

    if (guild.systemChannelId && sendable.has(guild.systemChannelId)) return sendable.get(guild.systemChannelId) as TextChannel | NewsChannel

    return sendable.sort((a, b) => a.rawPosition - b.rawPosition).first() ?? null
}
