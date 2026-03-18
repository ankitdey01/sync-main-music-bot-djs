import { CustomClient, ShoukakuEvent } from "../../structure/index.js"

export default new ShoukakuEvent({
    name: "close",
    async execute(client: CustomClient, name: string, code: number, reason: string) {
        client.logger.debug("Lavalink", `Node ${name} closed with code ${code}: ${reason || "No reason"}`)
    }
});
