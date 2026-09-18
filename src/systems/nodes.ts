import { NodeOption } from "shoukaku";

const nodes: NodeOption[] = [
    {
        name: process.env.LAVALINK_NODE_NAME || "Lavalink",
        url: process.env.LAVALINK_NODE_URL || "localhost:2333",
        auth: process.env.LAVALINK_NODE_AUTH || "youshallnotpass",
        secure: process.env.LAVALINK_NODE_SECURE === "true"
    }
]

export default nodes
