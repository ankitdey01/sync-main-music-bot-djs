import { CustomClient, ShoukakuEvent, sendLavalinkAlert } from "../../structure/index.js"

export default new ShoukakuEvent({
    name: "ready",
    async execute(client: CustomClient, name: string) {
        client.logger.info("Lavalink", `Node ${name} connected`);

        // Announce every connect with a dev ping, mirroring the error case
        const attempts = client.getNodeRetryCount(name);
        // Clear retry state before the external webhook request begins so a
        // slow/failing webhook can't leave stale retry tracking behind.
        client.clearNodeRetryTracking(name);
        await sendLavalinkAlert(
            client,
            `🟢 Lavalink node connected: ${name}`,
            attempts > 0 ? `Connected after ${attempts} reconnect attempt(s).` : `Node is online.`,
            "Green"
        );
    }
});