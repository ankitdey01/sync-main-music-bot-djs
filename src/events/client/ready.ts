

import { Events, ActivityType } from "discord.js";
import { Event, CustomClient } from "../../structure/index.js";

export default new Event({
    name: Events.ClientReady,
    once: true,
    execute(client: CustomClient) {
        client.logger.debug("System", `${client.user?.tag} is now online!`);
        
        client.user?.setActivity({
            name: "Music | /play",
            type: ActivityType.Playing
        });
    }
});
