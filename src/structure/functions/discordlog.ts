import { EmbedBuilder, WebhookClient, BaseGuildTextChannel } from "discord.js"
import { CustomClient } from "../classes/index.js"

export async function log(client: CustomClient, embed: EmbedBuilder, address: string) {

    if (address.length == 121) {
        const webClient = new WebhookClient({ url: address })

        return await webClient.send({ embeds: [embed] }).catch(() => { })
    }
    else {
        const Channel = await client.channels.fetch(address).catch(() => { })
        if (!Channel) return

        return await (Channel as BaseGuildTextChannel).send({ embeds: [embed] }).catch(() => { })
    }
}