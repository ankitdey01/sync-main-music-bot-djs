import { CustomClient } from "../structure/index.js";

let cachedTrending: { name: string; value: string }[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

/**
 * Fetch top trending music videos from YouTube via Lavalink (kazagumo search).
 * Results are cached for 1 hour to avoid excessive API calls.
 */
export async function getTrendingSongs(client: CustomClient): Promise<{ name: string; value: string }[]> {
    const now = Date.now();

    // Return cached results if still valid
    if (cachedTrending.length > 0 && now - lastFetchTime < CACHE_DURATION) {
        return cachedTrending;
    }

    try {
        // Search for trending/popular music
        const result = await client.kazagumo.search(`trending music english ${new Date().getFullYear()}`);

        // Skip paid-only results (movies/rentals/premium) the same way the
        // /play autocomplete does - they fail at playback with "requires
        // payment" and should never be suggested.
        const playable = result.tracks.filter((t: any) => {
            const raw = (() => { try { return t?.getRaw?.(); } catch { return undefined; } }) as any;
            const candidates: unknown[] = [t, t?.info, t?.pluginInfo, raw?.info, raw?._raw?.info, raw?._raw?.pluginInfo];
            const keys = ["isPaid", "isPremium", "requiresPayment", "purchaseRequired", "paidContent", "isPaidContent", "requiresPurchase", "premium", "paid"];
            for (const c of candidates) {
                if (!c || typeof c !== "object") continue;
                for (const k of keys) {
                    const v = (c as Record<string, any>)[k];
                    if (v === true || v === "true" || v === 1) return false;
                }
            }
            const uri: unknown = t?.uri ?? raw?.info?.uri;
            if (typeof uri === "string" && /youtube\.com\/(movie|rent|premium)|music\.youtube\.com\/.*[?&]paid=/i.test(uri)) return false;
            return true;
        });

        const choices = playable.slice(0, 4).map(t => ({
            name: t.title.slice(0, 100) || "Unknown",
            value: t.uri || `https://www.youtube.com/watch?v=${t.identifier}`
        }));

        if (choices.length > 0) {
            cachedTrending = choices;
            lastFetchTime = now;
            return cachedTrending;
        }

        // Search came up empty - fall back to cached/static choices instead of
        // returning nothing (getFallbackTrendingChoices serves the warm cache
        // when one exists, static queries when the cache is cold).
        return getFallbackTrendingChoices();
    } catch (error) {
        console.error("Error fetching trending songs:", error);
        return getFallbackTrendingChoices();
    }
}

/**
 * Trending choices without touching Lavalink - the last cached results if we
 * have any, otherwise static queries. Used when a search already failed or
 * came back empty, so we never fire a second doomed request at Lavalink.
 */
export function getFallbackTrendingChoices(): { name: string; value: string }[] {
    if (cachedTrending.length > 0) return cachedTrending;
    // Same year logic as the live search query above, so the static queries
    // stay current instead of aging in place.
    const year = new Date().getFullYear();
    return [
        { name: "Popular Music", value: `popular music english ${year}` },
        { name: "Top Songs", value: `top songs english ${year}` },
        { name: "Trending Now", value: `trending music english ${year}` },
        { name: "New Music", value: `new music english ${year}` }
    ];
}
