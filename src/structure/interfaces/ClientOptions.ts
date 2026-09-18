import { ClientOptions, ColorResolvable } from "discord.js";

export interface CustomClientOptions extends ClientOptions {
    data: ClientDataOptions;
}

export interface ClientDataOptions {
    dev: DevOptions;
    prod: ProdOptions;
    links: LinksOptions;
    topgg: TopGGOptions;
    spotify: SpotifyOptions;
    lavalink: LavalinkOptions;
    handlers: HandlersOptions;
    guilds: GuildsOptions;
    color: ColorResolvable;
    developers: string[];
    maxSongsPerDay: number;
    playerLimits: PlayerLimitsOptions;
    devBotEnabled: boolean;
}

export interface DevOptions {
    id: string;
    secret: string;
    token: string;
    db: string;
    webhook: WebhookOptions;
}

export interface ProdOptions {
    id: string;
    secret: string;
    token: string;
    db: string;
    webhook: WebhookOptions;
}

export interface WebhookOptions {
    command: string;
    guild: string;
    error: string;
}

export interface LinksOptions {
    invite: string;
    support: string;
}

export interface TopGGOptions {
    token: string;
    vote: string;
}

export interface SpotifyOptions {
    id: string;
    secret: string;
}

export interface LavalinkOptions {
    webhook: string;
}

export interface HandlersOptions {
    commands: string;
    events: string;
    shoukakuEvents: string;
}

export interface GuildsOptions {
    dev: string[];
}

export interface PlayerLimitsOptions {
    soloMaxMs: number;
    multiMaxMs: number;
    warningBeforeMs: number;
}
