import { CustomClient, ShoukakuEvent, sendLavalinkAlert } from "../../structure/index.js"

export default new ShoukakuEvent({
    name: "error",
    execute(client: CustomClient, name: string, error: any) {
        const errorMessage = error.toString();
        client.logger.error("Lavalink", `Node ${name} faced error: ${errorMessage}`);

        // Schedule retry if it's a connection refused error; only claim
        // scheduled retries when one was actually scheduled.
        const retryScheduled = client.scheduleNodeRetry(name, errorMessage);

        // Ping developers on the Lavalink webhook about the outage
        void sendLavalinkAlert(client, `🔴 Lavalink node error: ${name}`, `\`\`\`${errorMessage.slice(0, 1500)}\`\`\`${retryScheduled ? `\nReconnect retries scheduled (5m × 5 → 30m × 5 → 1h forever).` : ``}`);
    }
});
