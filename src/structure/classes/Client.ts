import { Client, Collection, ColorResolvable } from "discord.js";
import mongoose from "mongoose";
import { ClientDataOptions, CustomClientOptions, BaseApplicationCommand } from "../interfaces/index.js";
import { Handler } from "./index.js";
import { Logger } from "./Logger.js";
import { schedulePlayerLimits, clearPlayerLimits } from "../functions/playerLimits.js";import { Shoukaku, Connectors, NodeOption } from "shoukaku";
import { Kazagumo, KazagumoPlayer } from "kazagumo";
import Spotify from "kazagumo-spotify";
import { ensureDailyPlaysIndex } from "../../schemas/dailyplays.js";
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

    color: ColorResolvable = "#000000";

    async initShoukaku() {
        // Load nodes dynamically after env is loaded
        const nodes: NodeOption[] = [
            {
                name: process.env.LAVALINK_NODE_NAME || "Lavalink",
                url: process.env.LAVALINK_NODE_URL || "localhost:2333",
                auth: process.env.LAVALINK_NODE_AUTH || "youshallnotpass",
                secure: process.env.LAVALINK_NODE_SECURE === "true"
            }
        ];

        this.logger.info("Lavalink", `Connecting to node: ${nodes[0].name} at ${nodes[0].url}`);

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

        // Stamp each player's creation time so the owner Players panel can
        // show "playing since" (Kazagumo tracks no uptime itself), and arm
        // the session-length checkpoints (2h solo / 3h max).
        this.kazagumo.on("playerCreate", (player) => {
            player.data.set("createdAt", Date.now());
            schedulePlayerLimits(this, player);
        });

        // Player is gone (stopped, empty VC, expired) - cancel its checkpoints
        this.kazagumo.on("playerDestroy", (player) => {
            clearPlayerLimits(player);
        });

        // Handle shoukaku errors
        this.shoukaku.on("error", (_, error) => {
            this.logger.error("Shoukaku", `Error: ${error.message}`);
        });
    }

    async start() {
        // Initialize Shoukaku before logging in
        await this.initShoukaku();

        await this.login(this.data.devBotEnabled ? this.data.dev.token : this.data.prod.token);

        // Connect the database and prepare the daily-plays unique index
        // before loading interaction handlers or accepting commands, so
        // limited playback never runs against unprepared indexes.
        mongoose.set("strictQuery", false);
        try {
            const data = await mongoose.connect(this.data.devBotEnabled ? this.data.dev.db : this.data.prod.db);
            this.logger.info("Database", "Connected to : " + this.logger.highlight(data.connection.name, "success"));
            // Dedupe + build the unique User+Date index for daily plays
            await ensureDailyPlaysIndex();
        } catch {
            this.logger.error("Database", "Error Connecting to Database or preparing indexes - stopping startup!");
            throw new Error("Database initialization failed");
        }

        this.handlers.catchErrors();
        this.handlers.loadEvents(this.data.handlers.events);
        this.handlers.loadCommands(this.data.handlers.commands);
        this.handlers.loadShoukakuEvents(this.data.handlers.shoukakuEvents);
    }

    /**
     * Get retry delay based on retry count
     * - Every 5 minutes, 5 times (attempts 1-5)
     * - Every 30 minutes, 5 times (attempts 6-10)
     * - Every hour, forever after that (attempt 11+)
     */
    private getRetryDelay(retryCount: number): number {
        if (retryCount < 5) {
            return 5 * 60 * 1000;
        } else if (retryCount < 10) {
            return 30 * 60 * 1000;
        } else {
            return 60 * 60 * 1000;
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
     * How many reconnect attempts have been made for a node (0 if none tracked)
     */
    public getNodeRetryCount(nodeName: string): number {
        return this.nodeRetryTracking.get(nodeName)?.retryCount ?? 0;
    }

    /**
     * Schedule a retry for a failed node connection.
     * Retries forever: every 5m x5, then every 30m x5, then every 1h.
     * Returns true when a retry was actually scheduled (ECONNREFUSED),
     * false otherwise so callers don't claim scheduled retries for other errors.
     */
    public scheduleNodeRetry(nodeName: string, errorMessage: string): boolean {
        // Check if error is ECONNREFUSED
        if (!errorMessage.includes("ECONNREFUSED")) {
            return false;
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

        // Log retry attempt info
        const delayMinutes = delay / 60000;
        const delayText = delayMinutes < 60
            ? `${delayMinutes}m`
            : `${Math.floor(delayMinutes / 60)}h`;

        this.logger.info("Lavalink", `Node ${nodeName} will retry connection in ${delayText} (attempt ${tracking.retryCount + 1}, retries never stop)`);

        // Schedule retry
        tracking.timeoutId = setTimeout(() => {
            this.attemptNodeReconnect(nodeName);
        }, delay);

        tracking.retryCount++;
        tracking.lastRetryTime = Date.now();
        return true;
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
