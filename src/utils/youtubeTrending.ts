import yt, { Video } from "youtube-sr";

let cachedTrending: { name: string; value: string }[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

/**
 * Fetch top trending music videos from YouTube
 * Results are cached for 1 hour to avoid excessive API calls
 */
export async function getTrendingSongs(): Promise<{ name: string; value: string }[]> {
    const now = Date.now();

    // Return cached results if still valid
    if (cachedTrending.length > 0 && now - lastFetchTime < CACHE_DURATION) {
        //console.log("Returning cached trending songs");
        return cachedTrending;
    }

    try {
        // Search for trending/popular music
        const searched = await yt.search("trending music 2026", {
            limit: 4,
            type: 'video'
        });

        const filtered = searched.filter(m => m.private === false);

        cachedTrending = filtered.slice(0, 4).map((x: Video) => ({
            name: x.title?.slice(0, 100) || "Unknown",
            value: x.url || ""
        }));

        lastFetchTime = now;

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
