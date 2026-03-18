import { Client, Collection, ColorResolvable } from "discord.js";
import mongoose from "mongoose";
import { ClientDataOptions, CustomClientOptions, BaseApplicationCommand } from "../interfaces/index.js";
import { Handler } from "./index.js";
import { Logger } from "./Logger.js";
import nodes from "../../systems/nodes.js";
import { Shoukaku, Connectors } from "shoukaku";
import { Kazagumo, KazagumoPlayer } from "kazagumo";
import Spotify from "kazagumo-spotify";
import config from "../../config.js";

const clientID: string = config.spotify.id;
const clientSecret: string = config.spotify.secret;

// Extend Client to include shoukaku and kazagumo
declare module "discord.js" {
    interface Client {
        shoukaku: Shoukaku;
        kazagumo: Kazagumo;
    }
}

export class CustomClient extends Client {
    commands: Collection<string, BaseApplicationCommand> = new Collection();
    data: ClientDataOptions;
    handlers: Handler = new Handler(this);
    logger: Logger = new Logger();
    shoukaku!: Shoukaku;
    kazagumo!: Kazagumo;

    // Retry tracking for Lavalink connections
    private nodeRetryTracking: Map<string, {
        retryCount: number;
        lastRetryTime: number;
        timeoutId: NodeJS.Timeout | null;
    }> = new Map();

    constructor(options: CustomClientOptions) {
        super(options);
        this.data = options.data;
        this.setMaxListeners(20);
    }

    color: ColorResolvable = "#009FFE";

    async initShoukaku() {
        // Initialize Kazagumo with Spotify plugin (it internally manages Shoukaku)
        this.kazagumo = new Kazagumo({
            defaultSearchEngine: "youtube",
            send: (guildId, payload) => {
                const guild = this.guilds.cache.get(guildId);
                if (guild) {
                    guild.shard?.send(payload);
                }
            },
            plugins: [
                new Spotify({
                    clientId: clientID,
                    clientSecret: clientSecret,
                    playlistPageLimit: 5,
                    albumPageLimit: 5,
                    searchLimit: 10,
                    searchMarket: "US",
                }),
            ],
        }, new Connectors.DiscordJS(this), nodes, {
            resume: true,
            resumeByLibrary: true,
            reconnectTries: 5,
            reconnectInterval: 6000,
            restTimeout: 10000,
        });

        this.shoukaku = this.kazagumo.shoukaku;

        // Handle shoukaku errors
        this.shoukaku.on("error", (_, error) => {
            this.logger.error("Shoukaku", `Error: ${error.message}`);
        });
    }

    async start() {
        // Initialize Shoukaku before logging in
        await this.initShoukaku();

        await this.login(this.data.devBotEnabled ? this.data.dev.token : this.data.prod.token);

        this.handlers.catchErrors();
        this.handlers.loadEvents(this.data.handlers.events);
        this.handlers.loadCommands(this.data.handlers.commands);
        this.handlers.loadShoukakuEvents(this.data.handlers.shoukakuEvents);

        mongoose.set("strictQuery", false);
        mongoose.connect(this.data.devBotEnabled ? this.data.dev.db : this.data.prod.db)
            .then((data) => {
                this.logger.info("Database", "Connected to : " + this.logger.highlight(data.connection.name, "success"));
            })
            .catch(() => {
                this.logger.error("Database", "Error Connecting to Database!");
            });
    }

    /**
     * Get retry delay based on retry count
     * - Every 5 seconds up to 20 seconds (attempts 1-4)
     * - Every minute up to 5 minutes (attempts 5-9)
     * - Every hour up to 3 hours (attempts 10-12)
     * - Returns null if max retries exceeded
     */
    private getRetryDelay(retryCount: number): number | null {
        if (retryCount < 4) {
            // Every 5 seconds: 5s, 10s, 15s, 20s
            return (retryCount + 1) * 5 * 1000;
        } else if (retryCount < 9) {
            // Every minute: 1m, 2m, 3m, 4m, 5m
            const minuteOffset = retryCount - 3;
            return minuteOffset * 60 * 1000;
        } else if (retryCount < 12) {
            // Every hour: 1h, 2h, 3h
            const hourOffset = retryCount - 8;
            return hourOffset * 60 * 60 * 1000;
        } else {
            // Max retries exceeded
            return null;
        }
    }

    /**
     * Clear retry tracking for a node
     */
    public clearNodeRetryTracking(nodeName: string): void {
        const tracking = this.nodeRetryTracking.get(nodeName);
        if (tracking?.timeoutId) {
            clearTimeout(tracking.timeoutId);
        }
        this.nodeRetryTracking.delete(nodeName);
    }

    /**
     * Schedule a retry for a failed node connection
     */
    public scheduleNodeRetry(nodeName: string, errorMessage: string): void {
        // Check if error is ECONNREFUSED
        if (!errorMessage.includes("ECONNREFUSED")) {
            return;
        }

        let tracking = this.nodeRetryTracking.get(nodeName);

        if (!tracking) {
            tracking = {
                retryCount: 0,
                lastRetryTime: Date.now(),
                timeoutId: null
            };
            this.nodeRetryTracking.set(nodeName, tracking);
        } else {
            // Clear existing timeout if any
            if (tracking.timeoutId) {
                clearTimeout(tracking.timeoutId);
            }
        }

        const delay = this.getRetryDelay(tracking.retryCount);

        if (delay === null) {
            this.logger.error("Lavalink", `Node ${nodeName} max retries exceeded. Stopping reconnection attempts.`);
            this.nodeRetryTracking.delete(nodeName);
            return;
        }

        // Log retry attempt info
        const delaySeconds = delay / 1000;
        const delayText = delaySeconds < 60
            ? `${delaySeconds}s`
            : delaySeconds < 3600
                ? `${Math.floor(delaySeconds / 60)}m`
                : `${Math.floor(delaySeconds / 3600)}h`;

        this.logger.info("Lavalink", `Node ${nodeName} will retry connection in ${delayText} (attempt ${tracking.retryCount + 1}/12)`);

        // Schedule retry
        tracking.timeoutId = setTimeout(() => {
            this.attemptNodeReconnect(nodeName);
        }, delay);

        tracking.retryCount++;
        tracking.lastRetryTime = Date.now();
    }

    /**
     * Attempt to manually reconnect a node
     */
    private async attemptNodeReconnect(nodeName: string): Promise<void> {
        try {
            const node = this.shoukaku.nodes.get(nodeName);

            if (!node) {
                this.logger.error("Lavalink", `Node ${nodeName} not found in Shoukaku nodes`);
                return;
            }

            // Check if already connected
            if (node.state === 2) { // 2 = CONNECTED state in Shoukaku
                this.logger.info("Lavalink", `Node ${nodeName} is already connected`);
                this.clearNodeRetryTracking(nodeName);
                return;
            }

            this.logger.info("Lavalink", `Attempting to reconnect node ${nodeName}...`);

            // Shoukaku will automatically attempt reconnection through its internal logic
            // We just need to ensure the node is properly tracked
            await node.connect();

        } catch (error: any) {
            this.logger.error("Lavalink", `Failed to reconnect node ${nodeName}: ${error.message}`);
        }
    }

    /**
     * Get a player for a guild
     */
    getPlayer(guildId: string): KazagumoPlayer | undefined {
        return this.kazagumo.getPlayer(guildId);
    }

    /**
     * Create a new player for a guild
     */
    async createPlayer(guildId: string, voiceChannelId: string, textChannelId: string, deaf?: boolean): Promise<KazagumoPlayer> {
        return this.kazagumo.createPlayer({
            guildId: guildId,
            voiceId: voiceChannelId,
            textId: textChannelId,
            deaf: deaf ?? true,
        });
    }
}
