import { Client, Collection, ColorResolvable } from "discord.js";
import mongoose from "mongoose";
import { ClientDataOptions, CustomClientOptions, BaseApplicationCommand } from "../interfaces/index.js";
import { Handler } from "./index.js";
import { Logger } from "./Logger.js";
import { schedulePlayerLimits, clearPlayerLimits } from "../functions/playerLimits.js";import { Shoukaku, Connectors, NodeOption, Constants } from "shoukaku";
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

    // Retry tracking for Lavalink connections. Retries never stop: the first
    // retry is fast (seconds) so a brief Lavalink restart recovers quickly,
    // then 5m x5, 30m x5, 1h forever after that. At most one pending timer
    // and one in-flight attempt exist per node at any time.
    private nodeRetryTracking: Map<string, {
        attempts: number;
        timeoutId: NodeJS.Timeout | null;
        reconnectInFlight: boolean;
    }> = new Map();

    // Original NodeOptions per node name. Shoukaku removes a node from its
    // internal map when it emits 'disconnect' and never re-adds it, so a
    // dropped node can only come back via addNode() with stored options.
    private nodeOptions: Map<string, NodeOption> = new Map();

    // Substrings (lowercased) identifying transient, reconnectable failures.
    // Unknown errors are ALSO retried (fail-open): a stranded node is worse
    // than a useless hourly attempt, and every attempt re-checks node state.
    private static readonly TRANSIENT_ERROR_PATTERNS = [
        "econnrefused",
        "econnreset",
        "etimedout",
        "ehostunreach",
        "enotfound",
        "eai_again",
        "epipe",
        "econnaborted",
        "503",
        "unexpected server response",
        "websocket closed before a connection was established",
        "handshake",
        "socket",
        "connection",
        "timed out",
        "timeout",
        "temporarily",
        "unavailable",
    ];

    constructor(options: CustomClientOptions) {
        super(options);
        this.data = options.data;
        this.setMaxListeners(20);
    }

    color: ColorResolvable = "#242429";

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
        // Remember the options so a node Shoukaku drops can be re-added later.
        for (const node of nodes) {
            this.nodeOptions.set(node.name, { ...node });
        }

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
            // NOTE: Shoukaku interprets reconnectInterval/restTimeout as
            // SECONDS (it multiplies them by 1000 internally). The previous
            // values of 6000/10000 therefore meant ~100min/~2.7h, which is why
            // a 14s Lavalink restart took ~100 minutes to even be retried.
            // Shoukaku's internal loop is only a short-term backstop; the
            // ensureNodeReconnect loop below owns long-term recovery.
            reconnectTries: 5,
            reconnectInterval: 5,
            restTimeout: 10,
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

        // Register every handler (including the Shoukaku node events) BEFORE
        // login. The DiscordJS connector adds Lavalink nodes on clientReady
        // and a localhost handshake can finish before post-login dynamic
        // imports complete, which would otherwise drop the initial 'ready'
        // event (and its webhook) on the floor.
        this.handlers.catchErrors();
        await Promise.all([
            this.handlers.loadEvents(this.data.handlers.events),
            this.handlers.loadCommands(this.data.handlers.commands),
            this.handlers.loadShoukakuEvents(this.data.handlers.shoukakuEvents),
        ]);

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

    }

    /**
     * Get retry delay based on completed attempts.
     * - First retry is fast (5s) so a 10-20s Lavalink restart recovers quickly
     * - Every 5 minutes for the next 5 attempts
     * - Every 30 minutes for the 5 after that
     * - Every hour, forever after that
     */
    private getRetryDelay(attempts: number): number {
        if (attempts <= 0) {
            return 5 * 1000;
        } else if (attempts <= 5) {
            return 5 * 60 * 1000;
        } else if (attempts <= 10) {
            return 30 * 60 * 1000;
        } else {
            return 60 * 60 * 1000;
        }
    }

    private formatRetryDelay(delay: number): string {
        if (delay < 60 * 1000) {
            return `${Math.round(delay / 1000)}s`;
        }
        const minutes = delay / 60000;
        return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h`;
    }

    /**
     * Clear retry tracking for a node (called on successful reconnect).
     * Cancels any pending timer so recovery emits exactly one webhook.
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
        return this.nodeRetryTracking.get(nodeName)?.attempts ?? 0;
    }

    /**
     * Whether an error looks like a transient connection failure (503,
     * handshake failure, closed-before-established, refused/reset/timed-out
     * sockets, ...). Informational only: ensureNodeReconnect retries
     * regardless, because a stranded node is worse than a useless attempt.
     */
    public isTransientConnectionError(errorMessage: string): boolean {
        const message = (errorMessage ?? "").toLowerCase();
        return CustomClient.TRANSIENT_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
    }

    /**
     * Arm the reconnect loop for a node. Safe to call from every lifecycle
     * event (error/close/disconnect): it no-ops when the node is already
     * CONNECTED, and never creates a second concurrent timer or attempt.
     * Retries continue until the node actually reconnects.
     * Returns true when a retry is (or already was) pending, false when the
     * node is already connected and there is nothing to do.
     */
    public ensureNodeReconnect(nodeName: string, reason: string): boolean {
        const node = this.shoukaku.nodes.get(nodeName);
        if (node && node.state === Constants.State.CONNECTED) {
            this.clearNodeRetryTracking(nodeName);
            return false;
        }

        let tracking = this.nodeRetryTracking.get(nodeName);
        if (!tracking) {
            tracking = { attempts: 0, timeoutId: null, reconnectInFlight: false };
            this.nodeRetryTracking.set(nodeName, tracking);
        }

        // Dedupe: a retry is already queued or running.
        if (tracking.timeoutId || tracking.reconnectInFlight) {
            return true;
        }

        const delay = this.getRetryDelay(tracking.attempts);
        const delayText = this.formatRetryDelay(delay);

        this.logger.info("Lavalink", `Node ${nodeName} reconnect attempt ${tracking.attempts + 1} in ${delayText} (${reason}; retries never stop)`);

        tracking.timeoutId = setTimeout(() => {
            const current = this.nodeRetryTracking.get(nodeName);
            if (current) {
                current.timeoutId = null;
            }
            void this.attemptNodeReconnect(nodeName);
        }, delay);
        return true;
    }

    /**
     * Execute one reconnect attempt for a node. Never throws.
     * - Missing node (Shoukaku drops it from its map on 'disconnect') is
     *   re-added via addNode() with the stored options.
     * - node.connect() is only ever called after checking state, and it is
     *   safe when CONNECTING/CONNECTED (Shoukaku returns immediately there
     *   instead of opening another socket).
     * - Any outcome that is not CONNECTED re-arms the loop via
     *   ensureNodeReconnect; CONNECTED clears all retry state.
     */
    private async attemptNodeReconnect(nodeName: string): Promise<void> {
        let tracking = this.nodeRetryTracking.get(nodeName);
        if (!tracking) {
            tracking = { attempts: 0, timeoutId: null, reconnectInFlight: false };
            this.nodeRetryTracking.set(nodeName, tracking);
        }
        if (tracking.timeoutId) {
            clearTimeout(tracking.timeoutId);
            tracking.timeoutId = null;
        }
        tracking.reconnectInFlight = true;

        // Reset the in-flight flag first so the follow-up can schedule.
        const finish = (followUpReason?: string) => {
            tracking!.reconnectInFlight = false;
            if (followUpReason) {
                this.ensureNodeReconnect(nodeName, followUpReason);
            }
        };

        try {
            const node = this.shoukaku.nodes.get(nodeName);

            if (!node) {
                const options = this.nodeOptions.get(nodeName);
                if (!options) {
                    this.logger.error("Lavalink", `Node ${nodeName} not found in Shoukaku nodes and no stored options exist to re-add it`);
                    finish();
                    return;
                }
                tracking.attempts++;
                this.logger.info("Lavalink", `Re-adding missing node ${nodeName} (reconnect attempt ${tracking.attempts})...`);
                // addNode() wires fresh event forwarding and starts connect()
                // internally; the result surfaces via ready/error/close events.
                this.shoukaku.addNode(options);
                finish("verifying re-added node connected");
                return;
            }

            // NOTE: Shoukaku's State enum is CONNECTING=0, CONNECTED=1,
            // DISCONNECTING=2, DISCONNECTED=3. Always compare against the
            // named enum, never a magic number.
            if (node.state === Constants.State.CONNECTED) {
                this.logger.info("Lavalink", `Node ${nodeName} is already connected`);
                this.clearNodeRetryTracking(nodeName);
                finish();
                return;
            }

            tracking.attempts++;
            this.logger.info("Lavalink", `Attempting to reconnect node ${nodeName} (attempt ${tracking.attempts})...`);

            await node.connect();

            const current = this.shoukaku.nodes.get(nodeName);
            if (current && current.state === Constants.State.CONNECTED) {
                this.clearNodeRetryTracking(nodeName);
                finish();
                return;
            }
            finish("reconnect attempt finished without reaching CONNECTED");
        } catch (error: any) {
            this.logger.error("Lavalink", `Failed to reconnect node ${nodeName}: ${error?.message ?? error}`);
            finish(`reconnect attempt failed: ${error?.message ?? error}`);
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
