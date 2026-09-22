import { CustomClient, ShoukakuEvent } from "../../structure/index.js"

export default new ShoukakuEvent({
    name: "close",
    async execute(client: CustomClient, name: string, code: number, reason: string) {
        client.logger.debug("Lavalink", `Node ${name} closed with code ${code}: ${reason || "No reason"}`)

        // A closed socket means Lavalink went away (restart/deploy/crash).
        // Arm the reconnect loop; it no-ops if the node is already back.
        client.ensureNodeReconnect(name, `socket closed (code ${code})`)
    }
});
