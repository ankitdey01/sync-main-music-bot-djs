import { CustomClient, Event } from "../../structure/index.js";
import { AutocompleteInteraction, Events } from "discord.js";
import yt, { Video } from "youtube-sr";
import PlaylistDB, { PlaylistSchema } from "../../schemas/playlist.js";
import { getTrendingSongs } from "../../utils/youtubeTrending.js";

export default new Event({
    name: Events.InteractionCreate,

    async execute(interaction: AutocompleteInteraction, client: CustomClient) {

        if (!interaction.isAutocomplete()) return

        switch (interaction.commandName) {
            case "play": {
                const query = interaction.options?.getString('query') || ''

                let choices: any[] = []

                // Count words in query (split by spaces and filter empty strings)
                const words = query.trim() //.split(/\s+/).filter(w => w.length > 0)

                // Show trending songs if query is empty or has only one word
                if (words.length <= 1) {
                    choices = await getTrendingSongs()
                } else {
                    // Normal autocomplete search when user types more than one word
                    const searched = await yt.search(query, {
                        limit: 4,
                        type: 'video'
                    })

                    const filtered = searched.filter(m => m.private === false)

                    filtered.forEach((x: Video) => {
                        choices.push({
                            name: x.title?.slice(0, 100),
                            value: x.url
                        })
                    })
                }

                if(!choices || choices.length === 0) {
                    choices.push({
                        name: "Trending songs",
                        value: "trending music 2026"
                    })
                }

                await interaction.respond(choices).catch(() => { })
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