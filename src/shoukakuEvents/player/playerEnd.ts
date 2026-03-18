import { ChannelType, BaseGuildTextChannel } from "discord.js";
import { KazagumoPlayer, KazagumoTrack, PlayerState } from "kazagumo";
import db, { PlayedSchema } from "../../schemas/played.js";
import buttonDB, { TempButtonSchema } from "../../schemas/tempbutton.js";
import { buttonDisable } from "../../systems/button.js";
import { CustomClient, ShoukakuEvent } from "../../structure/index.js"

export default new ShoukakuEvent({
    name: "playerEnd",
    async execute(player: KazagumoPlayer, track: KazagumoTrack, client: CustomClient) {

        //console.log(`[PLAYER_end] Disconnecting from voice channel in guild`);

        if (!track.requester) return;

        // Update played stats
        let data = await db.findOne<PlayedSchema>({ User: (track.requester as any)?.id }).catch(() => null);

        if (!data) {
            data = new db({
                User: (track.requester as any)?.id,
                Played: 1,
                Time: Number(track.length)
            });
            await data.save();
        } else {
            data.Played += 1;
            data.Time += Number(track.length);
            await data.save();
        }

        if (!player.textId) return;
        if (!client.channels) return;
        const channel = await client.channels.fetch(player.textId).catch(() => null) as BaseGuildTextChannel;
        if (!channel) return;
        if (channel.type !== ChannelType.GuildText) return;

        // Disable buttons on previous messages
        const bdata = await buttonDB.find<TempButtonSchema>({
            Guild: player.guildId,
            Channel: player.textId
        });

        for (let i = 0; i < bdata.length; i++) {
            const msg = await channel.messages?.fetch(bdata[i].MessageID).catch(() => null);
            if (msg && msg.editable) await msg.edit({ components: [buttonDisable] }).catch(() => { });
            if (bdata && bdata[i]) await bdata[i].deleteOne();
        }

        // Check if queue is empty and disconnect if needed
        if ((!player.queue || player.queue.length === 0) && !player.playing) {
            //console.log(player.queue)
            if (player.state == 1) player.disconnect();
            if (player.state !== PlayerState.DESTROYING && player.state !== PlayerState.DESTROYED) await player.destroy()
            //console.log(`[PLAYER_END] Successfully disconnected and destroyed player`);
        }
    }
});
