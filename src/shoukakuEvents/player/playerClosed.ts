import { ColorResolvable, EmbedBuilder } from "discord.js";
import { KazagumoPlayer } from "kazagumo";
import { musicSetupUpdate, ShoukakuEvent, CustomClient } from "../../structure/index.js"
import { clearChannelButtons } from "../../systems/button.js";
import { getBackgroundAttachmentUrl } from "../../utils/imageUtils.js";

export default new ShoukakuEvent({
    name: "playerClosed",
    async execute(player: KazagumoPlayer, client: CustomClient) {

        if (!player.textId) return;

        await clearChannelButtons(client, player.guildId, player.textId);

        const setupUpdateEmbed = new EmbedBuilder()
            .setColor(client.color as ColorResolvable)
            .setTitle(`No song playing currently`)
            .setImage(getBackgroundAttachmentUrl())
            .setDescription(
                `**[Invite Me](${client.data.links.invite})  :  [Support Server](${client.data.links.support})  :  [Vote Me](${client.data.topgg.vote})**`
            );

        await musicSetupUpdate(client, player, setupUpdateEmbed);
    }
});
