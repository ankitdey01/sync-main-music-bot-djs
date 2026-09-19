import { ColorResolvable } from 'discord.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const HOUR_MS = 60 * 60 * 1000;

// Single parser for positive-number envs - the Number() + isFinite + >0 shape
// was copy-pasted 3x. 0 or garbage falls back instead of disabling the limit.
function positiveNumber(raw: string | undefined, fallback: number): number {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

const maxSongsPerDay = positiveNumber(process.env.MAX_SONGS_PER_DAY_LIMIT, 10);

const soloMaxMs = positiveNumber(process.env.PLAYER_SOLO_MAX_HOURS, 2) * HOUR_MS;

const multiMaxMs = positiveNumber(process.env.PLAYER_MULTI_MAX_HOURS, 3) * HOUR_MS;

// tsx watch (npm run dev) executes src/*.ts directly, while npm start runs
// compiled dist/*.js. The handler dirs must match the running graph - if src
// code dynamically imports dist files, both copies of every module load side
// by side (duplicate mongoose models, double event listeners, split state).
const runningTs = (process.argv[1] || "").endsWith(".ts");
const handlersBase = runningTs ? "./src" : "./dist";

export default {
    dev: {
        id: process.env.DEV_BOT_ID || '',
        secret: process.env.DEV_CLIENT_SECRET || '',
        token: process.env.DEV_BOT_TOKEN || '',
        db: process.env.DEV_MONGODB_URI || '',
        webhook: {
            command: process.env.DEV_COMMAND_WEBHOOK || '',
            guild: process.env.DEV_GUILD_WEBHOOK || '',
            error: process.env.DEV_ERROR_WEBHOOK || ''
        }
    },
    prod: {
        id: process.env.PROD_BOT_ID || '',
        secret: process.env.PROD_CLIENT_SECRET || '',
        token: process.env.PROD_BOT_TOKEN || '',
        db: process.env.PROD_MONGODB_URI || '',
        webhook: {
            command: process.env.PROD_COMMAND_WEBHOOK || '',
            guild: process.env.PROD_GUILD_WEBHOOK || '',
            error: process.env.PROD_ERROR_WEBHOOK || ''
        }
    },
    links: {
        invite: process.env.INVITE_LINK || '',
        support: process.env.SUPPORT_SERVER || ''
    },
    topgg: {
        token: process.env.TOPGG_TOKEN || '',
        vote: process.env.TOPGG_VOTE_LINK || ''
    },
    spotify: {
        id: process.env.SPOTIFY_CLIENT_ID || '',
        secret: process.env.SPOTIFY_CLIENT_SECRET || ''
    },
    lavalink: {
        webhook: process.env.LAVALINK_WEBHOOK_URL || ''
    },
    handlers: {
        commands: `${handlersBase}/commands`,
        events: `${handlersBase}/events`,
        shoukakuEvents: `${handlersBase}/shoukakuEvents`
    },
    guilds: {
        dev: process.env.DEV_GUILD_IDS?.split(',') || []
    },
    color: (process.env.BOT_COLOR || '#2B2D31') as ColorResolvable,
    developers: process.env.DEVELOPER_IDS?.split(',') || [],
    maxSongsPerDay,
    playerLimits: {
        // Solo listener (0-1 non-bot members in VC) may run this long
        soloMaxMs,
        // 2+ listeners may run this long (absolute max for any player)
        multiMaxMs,
        // How far before each checkpoint the warning embed is sent
        warningBeforeMs: 10 * 60 * 1000
    }
};
