import { EmbedBuilder, BaseGuildTextChannel } from "discord.js";
import { KazagumoPlayer } from "kazagumo";
import { CustomClient } from "../index.js";
import { Model } from "mongoose";
import { MusicChannelDocument } from "../../schemas/musicchannel.js";


export async function musicSetupUpdate(
    client: CustomClient,
    player: KazagumoPlayer,
    setupDB: Model<MusicChannelDocument>,
    embed: EmbedBuilder,
    files?: any[]
) {
    const data = await setupDB.findOne<MusicChannelDocument>({ 
        Guild: player.guildId,
        Channel: player.textId 
    }).catch(() => null);

    if (!data) return;

    const channel = await client.channels.fetch(data.Channel).catch(() => null) as BaseGuildTextChannel;
    if (!channel) return;

    const message = await channel.messages.fetch(data.Message).catch(() => null);
    if (!message || !message.editable) return;

    await message.edit({ embeds: [embed], files }).catch(() => {});
}
