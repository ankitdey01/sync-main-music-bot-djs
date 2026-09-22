import { CustomClient, ShoukakuEvent, sendLavalinkAlert } from "../../structure/index.js"

export default new ShoukakuEvent({
    name: "error",
    execute(client: CustomClient, name: string, error: any) {
        const errorMessage = error?.message ?? String(error);
        const transient = client.isTransientConnectionError(errorMessage);
        client.logger.error("Lavalink", `Node ${name} faced error: ${errorMessage}`);

        // Arm the reconnect loop for EVERY error, not just ECONNREFUSED: the
        // production outage produced 503s and "closed before established",
        // and Shoukaku gives up on its own after reconnectTries. This no-ops
        // when the node is already (or still) CONNECTED.
        const retryPending = client.ensureNodeReconnect(name, `node error${transient ? " (transient)" : ""}`);

        // Ping developers on the Lavalink webhook about the outage
        void sendLavalinkAlert(client, `🔴 Lavalink node error: ${name}`, `\`\`\`${errorMessage.slice(0, 1500)}\`\`\`${retryPending ? `\nReconnect retries armed (fast first retry → 5m × 5 → 30m × 5 → 1h, until connected).` : ``}`);
    }
});
