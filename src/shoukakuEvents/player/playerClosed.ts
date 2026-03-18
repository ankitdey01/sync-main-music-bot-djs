import { BaseGuildTextChannel, ColorResolvable, EmbedBuilder } from "discord.js";
import { KazagumoPlayer } from "kazagumo";
import buttonDB, { TempButtonSchema } from "../../schemas/tempbutton.js";
import setupDB from "../../schemas/musicchannel.js"
import { musicSetupUpdate, ShoukakuEvent, CustomClient } from "../../structure/index.js"
import { buttonDisable } from "../../systems/button.js";
import { getBackgroundAttachmentUrl } from "../../utils/imageUtils.js";

export default new ShoukakuEvent({
    name: "playerClosed",
    async execute(player: KazagumoPlayer, client: CustomClient) {

        //console.log(`[PLAYER_CLOSED]closed from voice channel in guild`);

        if (!player.textId) return;
        if (!client.channels) return;

        const channel = await client.channels.fetch(player.textId).catch(() => null) as BaseGuildTextChannel;
        if (!channel) return;

        // Disable buttons
        const data = await buttonDB.find<TempButtonSchema>({ 
            Guild: player.guildId, 
            Channel: player.textId 
        });

        for (let i = 0; i < data.length; i++) {
            const msg = await channel.messages.fetch(data[i].MessageID).catch(() => null);
            if (msg && msg.editable) await msg.edit({ components: [buttonDisable] }).catch(() => {});
            await data[i].deleteOne();
        }

        const setupUpdateEmbed = new EmbedBuilder()
            .setColor(client.color as ColorResolvable)
            .setTitle(`No song playing currently`)
            .setImage(getBackgroundAttachmentUrl())
            .setDescription(
                `**[Invite Me](${client.data.links.invite})  :  [Support Server](${client.data.links.support})  :  [Vote Me](${client.data.topgg.vote})**`
            );

        await musicSetupUpdate(client, player, setupDB, setupUpdateEmbed);
    }
});
