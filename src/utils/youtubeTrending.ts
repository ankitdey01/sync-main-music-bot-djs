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
        const result = await client.kazagumo.search("trending music 2026");

        const choices = result.tracks.slice(0, 4).map(t => ({
            name: t.title.slice(0, 100) || "Unknown",
            value: t.uri || `https://www.youtube.com/watch?v=${t.identifier}`
        }));

        if (choices.length > 0) {
            cachedTrending = choices;
            lastFetchTime = now;
        }

        return cachedTrending;
    } catch (error) {
        console.error("Error fetching trending songs:", error);

        // Return fallback popular music queries
        return [
            { name: "Popular Music", value: "popular music 2026" },
            { name: "Top Songs", value: "top songs 2026" },
            { name: "Trending Now", value: "trending music now" },
            { name: "New Music", value: "new music 2026" }
        ];
    }
}
