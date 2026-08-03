import { NodeOption } from "shoukaku";

const nodes: NodeOption[] = [
    {
        name: process.env.LAVALINK_NODE_NAME || "",
        url: process.env.LAVALINK_NODE_URL || "",
        auth: process.env.LAVALINK_NODE_AUTH || "",
        secure: process.env.LAVALINK_NODE_SECURE === "true"
    }
]

export default nodes
