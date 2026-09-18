import crypto from "node:crypto";
import express, { NextFunction, Request, Response } from "express";
import type { CustomClient } from "./Client.js";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour per spec
const RATE_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_MAX = 10; // 10 req/min per IP

interface TopServer {
    name: string;
    icon: string | null;
    memberCount: number;
}

interface CachedStats {
    serverCount: number;
    memberCount: number;
    topServers: TopServer[];
    cachedAt: number;
    expiresAt: number;
}

interface RateEntry {
    count: number;
    resetAt: number;
}

function safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
}

export class StatsApi {
    private app = express();
    private cache: CachedStats | null = null;
    private rates = new Map<string, RateEntry>();

    constructor(private client: CustomClient) {
        this.app.disable("x-powered-by");
        this.app.set("trust proxy", 1);

        // Public health probe (no auth, but rate-limited like everything
        // else) - 200 means the process is up and the Discord client is
        // online. Anything else (refused/timeout/5xx) means it isn't.
        // Uptime monitors hit this.
        this.app.use(this.rateLimit.bind(this));
        this.app.get("/health", (_req: Request, res: Response) => {
            if (!this.client.isReady()) {
                res.status(503).json({ status: "not_ready" });
                return;
            }
            res.status(200).json({
                status: "ok",
                uptimeSec: Math.floor((this.client.uptime ?? 0) / 1000),
                players: this.client.kazagumo?.players.size ?? 0,
            });
        });

        this.app.use(this.requireBearer.bind(this));

        this.app.get("/api/server/count", (_req: Request, res: Response) => {
            const stats = this.getStats();
            res.set("Cache-Control", "private, max-age=3600");
            res.json({ serverCount: stats.serverCount });
        });

        this.app.get("/api/member/count", (_req: Request, res: Response) => {
            const stats = this.getStats();
            res.set("Cache-Control", "private, max-age=3600");
            res.json({ memberCount: stats.memberCount });
        });

        this.app.get("/api/server/top", (_req: Request, res: Response) => {
            const stats = this.getStats();
            res.set("Cache-Control", "private, max-age=3600");
            res.json({ servers: stats.topServers });
        });

        this.app.use((_req: Request, res: Response) => {
            res.status(404).json({ error: "Not found" });
        });
    }

    private requireBearer(req: Request, res: Response, next: NextFunction): void {
        const key = process.env.STATS_API_KEY || "";
        if (!key) {
            res.status(500).json({ error: "Stats API not configured" });
            return;
        }
        const header = req.headers.authorization || "";
        const [scheme, token] = header.split(" ");
        if (scheme !== "Bearer" || !token || !safeEqual(token, key)) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        next();
    }

    private rateLimit(req: Request, res: Response, next: NextFunction): void {
        const ip = req.ip || req.socket.remoteAddress || "unknown";
        const now = Date.now();
        // Prune expired entries for all IPs so the map can't grow unbounded;
        // only the current window stays resident. Cap survivors to bound a
        // single-window flood of distinct IPs.
        for (const [key, entry] of this.rates) {
            if (now >= entry.resetAt) this.rates.delete(key);
        }
        if (this.rates.size > 5000) {
            const oldest = this.rates.keys().next().value;
            if (oldest !== undefined) this.rates.delete(oldest);
        }
        const entry = this.rates.get(ip);
        if (!entry || now >= entry.resetAt) {
            this.rates.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
            next();
            return;
        }
        entry.count += 1;
        res.set("RateLimit-Limit", String(RATE_MAX));
        res.set("RateLimit-Remaining", String(Math.max(0, RATE_MAX - entry.count)));
        if (entry.count > RATE_MAX) {
            res.status(429).json({ error: "Too many requests" });
            return;
        }
        next();
    }

    private getStats(): CachedStats {
        const now = Date.now();
        if (this.cache && now < this.cache.expiresAt) return this.cache;
        const guilds = [...this.client.guilds.cache.values()];
        const serverCount = guilds.length;
        const memberCount = guilds.reduce((acc, g) => acc + (g.memberCount ?? 0), 0);
        const topServers: TopServer[] = guilds
            .sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0))
            .slice(0, 5)
            .map((g) => ({
                name: g.name,
                icon: typeof g.iconURL === "function" ? g.iconURL({ size: 128 }) : null,
                memberCount: g.memberCount ?? 0,
            }));
        this.cache = { serverCount, memberCount, topServers, cachedAt: now, expiresAt: now + CACHE_TTL_MS };
        return this.cache;
    }

    start(): void {
        const key = process.env.STATS_API_KEY || "";
        if (!key) {
            this.client.logger.error("StatsApi", "STATS_API_KEY missing - stats API disabled");
            return;
        }
        const port = Number(process.env.STATS_API_PORT || process.env.PORT || 3001);
        if (!Number.isFinite(port) || port <= 0) {
            this.client.logger.error("StatsApi", "Invalid STATS_API_PORT - stats API disabled");
            return;
        }
        const host = process.env.STATS_API_HOST || "127.0.0.1";
        const server = this.app.listen(port, host, () => {
            this.client.logger.info("StatsApi", `Private stats API listening on ${host}:${port}`);
        });
        server.on("error", (err: NodeJS.ErrnoException) => {
            this.client.logger.error("StatsApi", `Failed to bind ${host}:${port} - ${err.code ?? err.message}`);
        });
    }

    // Exposed for tests only
    getExpressApp(): express.Express {
        return this.app;
    }
}
