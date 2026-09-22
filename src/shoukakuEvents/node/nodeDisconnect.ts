import { CustomClient, ShoukakuEvent } from "../../structure/index.js"

export default new ShoukakuEvent({
    name: "disconnect",
    async execute(client: CustomClient, name: string, count: number) {
        client.logger.info("Lavalink", `Node ${name} disconnected (${count} players)`)

        // Defensive: Shoukaku 4.x does not forward the node's 'disconnect'
        // to the manager level (it only deletes the node from its map), so
        // this rarely fires — but if it does, the node must be recovered.
        // ensureNodeReconnect re-adds a missing node from stored options.
        client.ensureNodeReconnect(name, "node disconnected")
    }
});
