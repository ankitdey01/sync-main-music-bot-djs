import { CustomClient, ShoukakuEvent } from "../../structure/index.js"

export default new ShoukakuEvent({
    name: "ready",
    async execute(client: CustomClient, name: string) {
        client.logger.info("Lavalink", `Node ${name} connected`);

        // Clear retry tracking when node successfully connects
        client.clearNodeRetryTracking(name);
    }
});