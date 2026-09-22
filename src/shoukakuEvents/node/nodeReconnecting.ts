import { CustomClient, ShoukakuEvent } from "../../structure/index.js"

export default new ShoukakuEvent({
    name: "reconnecting",
    async execute(client: CustomClient, name: string, reconnectsLeft: number, reconnectInterval: number) {
        client.logger.info("Lavalink", `Node ${name} reconnecting (${reconnectsLeft} Shoukaku tries left, every ${reconnectInterval}s)`)
    }
});
