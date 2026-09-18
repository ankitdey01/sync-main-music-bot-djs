import { CustomClient } from "./structure/index.js";
import config from "./config.js";
import { Partials, GatewayIntentBits } from "discord.js";

const client = new CustomClient({
    data: {
        ...config,
        devBotEnabled: process.env.NODE_ENV === "dev" ? true : false
    },
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [
        Partials.Message,
        Partials.User,
        Partials.ThreadMember,
        Partials.GuildMember,
        Partials.Channel
    ],
    allowedMentions: { parse: ["everyone", "roles", "users"] }
});

export default client;

client.start();