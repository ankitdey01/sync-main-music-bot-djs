import { CustomClient, ShoukakuEvent } from "../../structure/index.js"

export default new ShoukakuEvent({
    name: "disconnect",
    async execute(client: CustomClient, name: string, count: number) {
        client.logger.info("Lavalink", `Node ${name} disconnected (${count} players)`)
    }
});
