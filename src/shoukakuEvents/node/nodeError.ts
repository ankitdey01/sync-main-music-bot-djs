import { CustomClient, ShoukakuEvent } from "../../structure/index.js"

export default new ShoukakuEvent({
    name: "error",
    execute(client: CustomClient, name: string, error: any) {
        const errorMessage = error.toString();
        client.logger.error("Lavalink", `Node ${name} faced error: ${errorMessage}`);

        // Schedule retry if it's a connection refused error
        client.scheduleNodeRetry(name, errorMessage);
    }
});
