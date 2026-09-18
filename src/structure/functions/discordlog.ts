import { EmbedBuilder, WebhookClient } from "discord.js"
import { CustomClient } from "../classes/index.js"

function isWebhookUrl(address: string): boolean {
    return address.startsWith("https://") && address.includes("/api/webhooks/");
}

// All bot logs ship through webhook URLs - channel IDs are not accepted.
// The client param is kept so every call site stays uniform.
export async function log(client: CustomClient, embed: EmbedBuilder, address: string, content?: string) {

    if (!isWebhookUrl(address)) {
        // Never interpolate the untrusted address (it may contain a webhook
        // ID/token) - fixed message preserves the warning without leaking it.
        console.warn(`[log] Refused non-webhook log address`);
        return;
    }

    try {
        const webClient = new WebhookClient({ url: address })

        return await webClient.send({
            ...(content ? { content, allowedMentions: { parse: ["users"] as const } } : {}),
            embeds: [embed]
        }).catch((sendError) => { client.logger.error("Log", `Failed to send webhook log: ${sendError}`) })
    } catch (error) {
        client.logger.error("Log", `Failed to send webhook log: ${error}`)
        return
    }
}

// Lavalink status alerts: posts to the LAVALINK_WEBHOOK_URL and tags every
// developer so the notification actually pings. No-op when unconfigured.
export async function sendLavalinkAlert(client: CustomClient, title: string, description: string, color: "Red" | "Green" = "Red") {

    const webhook = client.data.lavalink.webhook
    if (!webhook) {
        client.logger.error("Lavalink", `${title} (no LAVALINK_WEBHOOK_URL configured): ${description}`)
        return
    }

    const pings = client.data.developers.filter(Boolean).map((id) => `<@${id}>`).join(" ")

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description.slice(0, 4000))
        .setTimestamp()

    return log(client, embed, webhook, pings || undefined)
}
