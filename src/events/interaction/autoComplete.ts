import { CustomClient, Event } from "../../structure/index.js";
import { AutocompleteInteraction, Events } from "discord.js";
import PlaylistDB, { PlaylistSchema } from "../../schemas/playlist.js";
import { getTrendingSongs, getFallbackTrendingChoices } from "../../utils/youtubeTrending.js";

// Autocomplete results are cached globally by query (YouTube results do not
// differ per user, so one user's search serves everyone) for 5 minutes.
const SEARCH_CACHE_TTL = 5 * 60_000;
const SEARCH_CACHE_MAX = 200;
const searchCache = new Map<string, { at: number; choices: { name: string; value: string }[] }>();

// Discord fires an AutocompleteInteraction per keystroke. Hold each search for
// a short debounce and only run it for the user's newest query, so typing a
// 15-character query costs one InnerTube search instead of fifteen.
const SEARCH_DEBOUNCE_MS = 350;
// Discord rejects autocomplete responses older than ~3s.
const MAX_INTERACTION_AGE_MS = 2500;

const latestQueryByUser = new Map<string, string>();
const debounceTimers = new Map<string, NodeJS.Timeout>();

function cacheSearch(key: string, choices: { name: string; value: string }[]): void {
    if (searchCache.size >= SEARCH_CACHE_MAX) {
        const oldest = searchCache.keys().next().value;
        if (oldest !== undefined) searchCache.delete(oldest);
    }
    searchCache.set(key, { at: Date.now(), choices });
}

function isFresh(interaction: AutocompleteInteraction): boolean {
    return Date.now() - interaction.createdTimestamp <= MAX_INTERACTION_AGE_MS;
}

// Lavalink/Kazagumo has no single documented "paid" flag - different
// Lavalink builds/forks expose it under different keys (top-level,
// info, or pluginInfo). Filter a track when ANY known paid marker is
// truthy, plus conservative YouTube movie/rental URL shapes. Missing
// properties simply don't match, so normal tracks are never removed.
const PAID_FLAG_KEYS = [
    "isPaid",
    "isPremium",
    "requiresPayment",
    "purchaseRequired",
    "paidContent",
    "isPaidContent",
    "isPurchased",
    "requiresPurchase",
    "isMovie",
    "isRent",
    "membershipOnly",
    "premium",
    "paid",
];

function isPaidTrack(track: unknown): boolean {
    const t = track as any;
    const raw = (() => { try { return t?.getRaw?.(); } catch { return undefined; } }) as any;
    const candidates: unknown[] = [
        t,
        t?.info,
        t?.pluginInfo,
        raw?.info,
        raw?._raw?.info,
        raw?._raw?.pluginInfo,
    ];
    for (const c of candidates) {
        if (!c || typeof c !== "object") continue;
        const obj = c as Record<string, any>;
        for (const key of PAID_FLAG_KEYS) {
            const v = obj[key];
            if (v === true || v === "true" || v === 1 || v === "1") return true;
        }
        // One level deep: e.g. pluginInfo: { youtube: { isPaid: true } }
        for (const v of Object.values(obj)) {
            if (!v || typeof v !== "object" || Array.isArray(v)) continue;
            for (const key of PAID_FLAG_KEYS) {
                const nested = (v as Record<string, any>)[key];
                if (nested === true || nested === "true" || nested === 1 || nested === "1") return true;
            }
        }
    }
    const uri: unknown = t?.uri ?? raw?.info?.uri ?? raw?._raw?.info?.uri;
    if (typeof uri === "string" && /youtube\.com\/(movie|rent|premium)|music\.youtube\.com\/.*[?&]paid=/i.test(uri)) return true;
    return false;
}

export default new Event({
    name: Events.InteractionCreate,

    async execute(interaction: AutocompleteInteraction, client: CustomClient) {

        if (!interaction.isAutocomplete()) return

        switch (interaction.commandName) {
            case "play": {
                const query = interaction.options?.getString('query') || ''
                const trimmed = query.trim()
                const userId = interaction.user.id

                // Show trending songs if query is empty or has only one character
                if (trimmed.length <= 1) {
                    const pending = debounceTimers.get(userId)
                    if (pending) { clearTimeout(pending); debounceTimers.delete(userId) }
                    latestQueryByUser.delete(userId)
                    await interaction.respond(await getTrendingSongs(client)).catch(() => { })
                    return
                }

                latestQueryByUser.set(userId, interaction.id)
                const token = interaction.id
                const isLatest = () => latestQueryByUser.get(userId) === token

                // Cache hit: respond immediately (a newer keystroke still wins)
                const cacheKey = trimmed.toLowerCase()
                const cached = searchCache.get(cacheKey)
                if (cached && Date.now() - cached.at < SEARCH_CACHE_TTL) {
                    if (isLatest() && isFresh(interaction)) {
                        await interaction.respond(cached.choices).catch(() => { })
                        if (isLatest()) latestQueryByUser.delete(userId)
                    }
                    return
                }

                // Debounce: replace any pending search for this user; only the
                // newest query in a typing burst actually reaches Lavalink.
                const previous = debounceTimers.get(userId)
                if (previous) clearTimeout(previous)
                debounceTimers.set(userId, setTimeout(async () => {
                    debounceTimers.delete(userId)
                    if (!isLatest()) return
                    try {
                        // Re-check cache: a parallel user's search may have filled it
                        const hit = searchCache.get(cacheKey)
                        if (hit && Date.now() - hit.at < SEARCH_CACHE_TTL) {
                            if (isFresh(interaction)) await interaction.respond(hit.choices).catch(() => { })
                            return
                        }

                        const result = await client.kazagumo.search(query, { requester: interaction.user })

                        const choices = result.tracks.filter(t => !isPaidTrack(t)).slice(0, 4).map(t => ({
                            name: t.title.slice(0, 100) || "Unknown",
                            value: t.uri || `https://www.youtube.com/watch?v=${t.identifier}`
                        }))

                        if (choices.length > 0) cacheSearch(cacheKey, choices)

                        if (!isLatest() || !isFresh(interaction)) return
                        // The search already came up empty - don't fire another
                        // Lavalink request for trending, reuse cached/static choices.
                        if (choices.length > 0) await interaction.respond(choices).catch(() => { })
                        else await interaction.respond(getFallbackTrendingChoices()).catch(() => { })
                    } catch {
                        // Lavalink unreachable or slow - show cached/static choices
                        // instead of issuing another search against a dead node.
                        if (isLatest() && isFresh(interaction)) await interaction.respond(getFallbackTrendingChoices()).catch(() => { })
                    } finally {
                        // the race-guard entry lives only while this burst is in flight;
                        // re-checked by token so an older callback cannot remove a
                        // newer interaction's state.
                        if (latestQueryByUser.get(userId) === token) latestQueryByUser.delete(userId)
                    }
                }, SEARCH_DEBOUNCE_MS))
            }
                break;

            case "playlist": {

                const playlist = interaction.options?.getString('playlist') || ''

                const data = await PlaylistDB.findOne<PlaylistSchema>({ User: interaction.user.id }).catch(err => { })

                if(!data || !data.Playlist || data.Playlist.length < 1) return

                let choices: any[] = []

                // Filter playlists based on input, or show all if nothing typed
                const searched = playlist.length > 0
                    ? data.Playlist.filter(x => x.name.toLowerCase().includes(playlist.toLowerCase()))
                    : data.Playlist

                // Limit to top 4 results
                searched.slice(0, 4).forEach(x => {
                    choices.push({
                        name: x.name,
                        value: x.name
                    })
                })

                await interaction.respond(choices).catch(() => { })

            }
                break;

        }
    },
})
