import { KazagumoPlayer, KazagumoTrack } from "kazagumo";
import db, { PlayedSchema } from "../../schemas/played.js";
import { clearChannelButtons } from "../../systems/button.js";
import { CustomClient, ShoukakuEvent } from "../../structure/index.js"

export default new ShoukakuEvent({
    name: "playerEnd",
    async execute(player: KazagumoPlayer, track: KazagumoTrack, client: CustomClient) {

        if (!track.requester) return;

        // Update played stats - single upsert with atomic increment
        await db.updateOne(
            { User: (track.requester as any)?.id },
            { $inc: { Played: 1, Time: Number(track.length) } },
            { upsert: true }
        ).catch(() => null);

        if (!player.textId) return;
        await clearChannelButtons(client, player.guildId, player.textId);

        // Note: player disconnect/destroy on an empty queue is handled solely by
        // the playerEmpty handler — kazagumo emits playerEnd followed by playerEmpty
        // for the same end event, so destroying here too would be redundant and
        // races the playerEmpty handler.
    }
});
