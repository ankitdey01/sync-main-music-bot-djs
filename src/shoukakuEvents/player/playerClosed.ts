import { KazagumoPlayer } from "kazagumo";
import { musicSetupUpdate, idlePanelEmbed, ShoukakuEvent, CustomClient } from "../../structure/index.js"
import { clearChannelButtons } from "../../systems/button.js";

export default new ShoukakuEvent({
    name: "playerClosed",
    // Kazagumo emits (player, data, ...) - without the middle `data` arg,
    // `client` here receives the close payload and every client call throws.
    async execute(player: KazagumoPlayer, _data: unknown, client: CustomClient) {

        if (!client?.channels) return;
        if (!player.textId) return;

        await clearChannelButtons(client, player.guildId, player.textId);

        const setupUpdateEmbed = idlePanelEmbed(client);

        await musicSetupUpdate(client, player, setupUpdateEmbed);
    }
});
