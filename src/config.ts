import { ColorResolvable } from 'discord.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const isDev = process.env.NODE_ENV === 'dev';

export default {
    dev: {
        id: process.env.DEV_BOT_ID || '',
        secret: process.env.DEV_CLIENT_SECRET || '',
        token: process.env.DEV_BOT_TOKEN || '',
        db: process.env.DEV_MONGODB_URI || '',
        log: {
            error: process.env.DEV_ERROR_LOG_CHANNEL || '',
            guild: process.env.DEV_GUILD_LOG_CHANNEL || '',
            command: process.env.DEV_COMMAND_LOG_CHANNEL || ''
        },
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
        log: {
            error: process.env.PROD_ERROR_LOG_CHANNEL || '',
            guild: process.env.PROD_GUILD_LOG_CHANNEL || '',
            command: process.env.PROD_COMMAND_LOG_CHANNEL || ''
        },
        webhook: {
            command: process.env.PROD_COMMAND_WEBHOOK || '',
            guild: process.env.PROD_GUILD_WEBHOOK || '',
            error: process.env.PROD_ERROR_WEBHOOK || ''
        }
    },
    links: {
        invite: process.env.INVITE_LINK || '',
        support: process.env.SUPPORT_SERVER || '',
        background: process.env.BACKGROUND_PATH || './src/assets/background.jpg'
    },
    topgg: {
        token: process.env.TOPGG_TOKEN || '',
        vote: process.env.TOPGG_VOTE_LINK || ''
    },
    spotify: {
        id: process.env.SPOTIFY_CLIENT_ID || '',
        secret: process.env.SPOTIFY_CLIENT_SECRET || ''
    },
    handlers: {
        commands: './dist/commands',
        events: './dist/events',
        shoukakuEvents: './dist/shoukakuEvents'
    },
    guilds: {
        dev: process.env.DEV_GUILD_IDS?.split(',') || []
    },
    color: (process.env.BOT_COLOR || 'Blue') as ColorResolvable,
    developers: process.env.DEVELOPER_IDS?.split(',') || []
};
