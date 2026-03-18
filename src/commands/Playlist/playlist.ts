import { SlashCommandBuilder, EmbedBuilder, GuildMember, MessageFlags } from "discord.js"
import DB from "../../schemas/playlist"
import wait from "node:timers/promises"
import { playSong, paginate as Pagination, memberVoice, joinable, SlashCommand, stageCheck, differentVoice } from "../../structure"

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName("playlist")
        .setDescription("Create and manage your own music playlist")
        .addSubcommand(sub => // create
            sub.setName('create')
                .setDescription('Create a music playlist')
                .addStringOption(opt =>
                    opt.setName('name')
                        .setDescription('Enter the name for your playlist')
                        .setRequired(true)
                        .setMinLength(2)
                        .setMaxLength(10)
                )
                .addStringOption(opt =>
                    opt.setName("privacy")
                        .setDescription('Select the privacy of your playlist')
                        .setRequired(true)
                        .addChoices(
                            { name: "Private", value: "private" },
                            { name: "Public", value: "public" }
                        ))
        )
        .addSubcommand(sub => // delete
            sub.setName('delete')
                .setDescription('Delete a playlist')
                .addStringOption(opt =>
                    opt.setName('playlist')
                        .setDescription('Enter the name of the playlist')
                        .setRequired(true)
                        .setMaxLength(24)
                        .setMinLength(2)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(sub => // info
            sub.setName('info')
                .setDescription('Shows info about your playlist')
                .addStringOption(opt =>
                    opt.setName('playlist')
                        .setDescription('Enter the name of the playlist')
                        .setRequired(true)
                        .setMaxLength(10)
                        .setMinLength(2)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(sub => // list
            sub.setName('list')
                .setDescription('Shows all of your created playlist')
        )
        .addSubcommand(sub => // play
            sub.setName('play')
                .setDescription('Play songs from your playlist')
                .addStringOption(opt =>
                    opt.setName('playlist')
                        .setDescription('Enter the playlist name to play')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(sub => // add
            sub.setName('add')
                .setDescription('Add a song to your playlist')
                .addStringOption(opt =>
                    opt.setName('song')
                        .setDescription('Enter the song name or URL to add')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName('playlist')
                        .setDescription('Enter the playlist name')
                        .setRequired(true)
                        .setMaxLength(10)
                        .setMinLength(2)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(sub => // remove
            sub.setName('remove')
                .setDescription('Remove a song from your playlist')
                .addStringOption(opt =>
                    opt.setName('playlist')
                        .setDescription('Enter the playlist name')
                        .setRequired(true)
                        .setMaxLength(10)
                        .setMinLength(2)
                        .setAutocomplete(true)
                )
                .addIntegerOption(opt =>
                    opt.setName('position')
                        .setDescription('Enter the position of the song')
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(20)
                )
        )
        .addSubcommand(sub => // current
            sub.setName('current')
                .setDescription('Save the current playing song to your playlist')
                .addStringOption(opt =>
                    opt.setName('playlist')
                        .setDescription('Enter the playlist name')
                        .setRequired(true)
                        .setMaxLength(10)
                        .setMinLength(2)
                        .setAutocomplete(true)
                )
        ),
    category: "Playlist",
    async execute(interaction, client) {

        let data = await DB.findOne({ User: interaction.user.id })

        const errEmbed = new EmbedBuilder()
            .setColor("DarkRed")

        const succEmbed = new EmbedBuilder()
            .setColor(client.color)

        switch (interaction.options.getSubcommand()) {

            case "create": { // done

                const name = interaction.options.getString('name', true).toUpperCase()

                const Playlist = interaction.options.getString('privacy', true) === 'private' ? true : false

                await interaction.deferReply({ flags: MessageFlags.Ephemeral })

                if (data) { // if he is registered in the db

                    if (data.Playlist.length >= 3) return interaction.editReply({
                        embeds: [errEmbed.setDescription(`\`❌\` | You can only create a maximum of 3 playlist`)]
                    }) //check if he has 3 playlist

                    for (const playlist of data.Playlist) { // check if he has already created a playlist with that name

                        if (playlist.name == name) {

                            return interaction.editReply({

                                embeds: [errEmbed.setDescription(`\`❌\` | A playlist already exists with that name`)]
                            })

                        }
                    }

                    const newPlaylist = { // creates new playlist object
                        name: name,
                        songs: [],
                        private: Playlist,
                        created: Math.round(Date.now() / 1000)
                    }

                    data.Playlist.push(newPlaylist) //pushes it to the playlist array

                    await data.save() //saves the data

                    interaction.editReply({
                        embeds: [succEmbed.setDescription(`\`✅\` Created a playlist with the name **${name}**`)]
                    })

                } else {

                    data = new DB({
                        User: interaction.user.id,
                        Playlist: [{ name: name, songs: [], private: Playlist, created: Math.round(Date.now() / 1000) }]
                    })

                    await data.save()

                    interaction.editReply({
                        embeds: [succEmbed.setDescription(`\`✅\` Created a playlist with the name **${name}**`)]
                    })

                }

            }
                break;

            case "delete": { //done

                await interaction.deferReply({ flags: MessageFlags.Ephemeral })

                const playlist = interaction.options.getString('playlist', true).toUpperCase()

                if (!data || data.Playlist.length == 0) return interaction.editReply({ // check for playlist existence
                    embeds: [errEmbed.setDescription(`\`❌\` | You have no playlist created`)]
                })

                let index = data.Playlist.findIndex(x => x.name === playlist)

                if (index == -1) return interaction.editReply({
                    embeds: [errEmbed.setDescription(`\`❌\` | No playlist found with that name`)]
                })

                data.Playlist.splice(index, 1)

                await data.save()

                interaction.editReply({
                    embeds: [succEmbed.setDescription(`\`✅\` | Deleted the playlist`)]
                })

            }
                break;

            case "info": { // done

                const playlist = interaction.options.getString('playlist', true).toUpperCase()

                for (const list of data!.Playlist) {

                    if (list.name === playlist) {

                        if (list.songs.length === 0) return interaction.reply({
                            embeds: [
                                errEmbed.setDescription(`\`❌\` | The playlist is empty. Use \`/playlist add\` to add new songs`)
                            ], flags: MessageFlags.Ephemeral
                        })

                        const Sorted = list.songs

                        const embeds = animate(Sorted, 5, list.name.toUpperCase())
                        Pagination(interaction, embeds)

                        return

                    }

                }

                interaction.reply({
                    embeds: [errEmbed.setDescription(`\`❌\` | No playlist found named **${playlist}**`)], flags: MessageFlags.Ephemeral
                })

                function animate(pages: string[], number: number, playlistName: string) {

                    const Embeds = []
                    let k = number

                    for (let i = 0; i < pages.length; i += number) {

                        const current = pages.slice(i, k)

                        k += number

                        const MappedData = current.map(
                            value => `• ${(value as string).toUpperCase()}`
                        ).join("\n")

                        const Embed = new EmbedBuilder()
                            .setTitle(`__${playlistName}__ (${pages.length} / 20 Songs)`)
                            .setColor(client.color)
                            .setThumbnail(`${interaction.user.displayAvatarURL()}`)
                            .setFooter({ text: `${pages.length} / 20`, iconURL: interaction.guild?.iconURL() as string })
                            .setDescription(`\`\`\`${MappedData}\`\`\``)

                        Embeds.push(Embed)

                    }

                    return Embeds

                }

            }
                break;

            case "list": { // done

                if (!data || data.Playlist.length == 0) return interaction.reply({
                    embeds: [errEmbed.setDescription(`\`❌\` | You have no playlist`)], flags: MessageFlags.Ephemeral
                })

                await interaction.deferReply()

                let info1 = ``, info2 = ``, info3 = ``

                if (data.Playlist[0]) {

                    info1 = `__**${data.Playlist[0].name}**__\
                    \n> **Total Songs: ${data.Playlist[0].songs.length} / 20\
                    \n> Privacy: ${data.Playlist[0].private === true ? `Private` : `Public`}\
                    \n> Created On: **<t:${data.Playlist[0].created}>`

                }
                if (data.Playlist[1]) {

                    info2 = `__**${data.Playlist[1].name}**__\
                    \n> **Total Songs: ${data.Playlist[1].songs.length} / 20\
                    \n> Privacy: ${data.Playlist[1].private === true ? `Private` : `Public`}\
                    \n> Created On: **<t:${data.Playlist[1].created}>`
                }
                if (data.Playlist[2]) {

                    info3 = `__**${data.Playlist[2].name}**__\
                    \n> **Total Songs: ${data.Playlist[2].songs.length} / 20\
                    \n> Privacy: ${data.Playlist[2].private === true ? `Private` : `Public`}\
                    \n> Created On: **<t:${data.Playlist[2].created}>`

                }

                const List = new EmbedBuilder()
                    .setColor(client.color)
                    .setAuthor({ name: `${interaction.user.username} Playlist(s)`, iconURL: interaction.user.displayAvatarURL() })
                    .setDescription(`${info1}\n\n${info2}\n\n${info3}`)
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .setFooter({ text: `Playlist ${data.Playlist.length} / 3` })

                interaction.editReply({
                    embeds: [List]
                })

            }
                break;

            case "play": {

                if (await memberVoice(interaction)) return
                if (await joinable(interaction)) return
                if (await differentVoice(interaction)) return
                if (await stageCheck(interaction)) return

                await interaction.deferReply()

                if (!data || data.Playlist.length === 0) return interaction.editReply({
                    embeds: [errEmbed.setDescription(`\`❌\` | You have no playlist created. Use \`/playlist create\` to create one`)]
                })

                const playlist = interaction.options.getString('playlist', true).toUpperCase()

                for (const list of data.Playlist) {

                    if (list.name === playlist) {

                        if (list.songs.length === 0) return interaction.editReply({
                            embeds: [errEmbed.setDescription(`\`❌\` | The playlist is empty. Use \`/playlist add\` to add new songs`)]
                        })

                        const voiceChannelId = (interaction.member as GuildMember).voice.channel?.id;
                        if (!voiceChannelId) return;

                        const player = await client.kazagumo.createPlayer({
                            guildId: interaction.guild?.id as string,
                            voiceId: voiceChannelId,
                            textId: interaction.channel?.id as string,
                            deaf: true
                        })

                        for (const song of list.songs) {

                            playSong(interaction, client, player, song)

                            await wait.setTimeout(1200)

                        }

                        return
                    }

                }

                interaction.editReply({
                    embeds: [errEmbed.setDescription(`\`❌\` | No playlist found named **${playlist}**`)]
                })

            }
                break;

            case "add": { //works 

                await interaction.deferReply({ flags: MessageFlags.Ephemeral })

                if (!data || data.Playlist.length == 0) return interaction.editReply({
                    embeds: [errEmbed.setDescription(`\`❌\` | You have no playlist created. Use \`/playlist create\` to create one`)]
                })

                const playlist = interaction.options.getString('playlist', true).toUpperCase()
                const song = interaction.options.getString('song', true)

                for (const list of data.Playlist) {

                    if (list.name === playlist) {

                        if (list.songs.length >= 20) return interaction.editReply({
                            embeds: [errEmbed.setDescription(`\`❌\` | Maximum of 20 songs can be added`)]
                        })

                        list.songs.push(song)

                        await data.save()

                        return interaction.editReply({
                            embeds: [succEmbed.setDescription(`\`✅\` | Added the song to **${playlist}** `)]
                        })

                    }
                }

                interaction.editReply({
                    embeds: [errEmbed.setDescription(`\`❌\` | No playlist found named **${playlist}**`)]
                })

            }
                break;

            case "remove": { //works

                await interaction.deferReply({ flags: MessageFlags.Ephemeral })

                const playlist = interaction.options.getString('playlist', true).toUpperCase()
                const position = interaction.options.getInteger('position', true)

                for (const list of data!.Playlist) {

                    if (list.name === playlist) {

                        if (list.songs.length === 0) return interaction.editReply({
                            embeds: [
                                errEmbed.setDescription(`\`❌\` | The playlist is empty. Use \`/playlist add\` to add new songs`)
                            ]
                        })

                        list.songs.splice(Number(position) - 1, 1)

                        await data!.save()

                        return interaction.editReply({
                            embeds: [succEmbed.setDescription(`\`✅\` | Removed the song at position ${Number(position)}`)]
                        })

                    }

                }

                interaction.editReply({
                    embeds: [errEmbed.setDescription(`\`❌\` | No playlist found named **${playlist}**`)]
                })

            }
                break;

            case "current": {

                await interaction.deferReply({ flags: MessageFlags.Ephemeral })

                if (!data || data.Playlist.length == 0) return interaction.editReply({
                    embeds: [errEmbed.setDescription(`\`❌\` | You have no playlist created. Use \`/playlist create\` to create one`)]
                })

                const playlist = interaction.options.getString('playlist', true).toUpperCase()

                const player = client.kazagumo.getPlayer(interaction.guild?.id as string)

                if (!player) return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor("DarkRed")
                        .setDescription("No song player was found")
                    ]
                })

                if (!(player.playing || player.paused || player.queue.current)) return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor("DarkRed")
                        .setDescription("No song was found playing")
                    ]
                })

                const track = player.queue.current

                for (const list of data.Playlist) {

                    if (list.name === playlist) {

                        if (list.songs.length >= 20) return interaction.editReply({
                            embeds: [errEmbed.setDescription(`\`❌\` | Maximum of 20 songs can be added`)]
                        })

                        list.songs.push(track?.uri as string)

                        await data.save()

                        return interaction.editReply({
                            embeds: [succEmbed.setDescription(`\`✅\` | Added the song to **${playlist}**`)]
                        })

                    }

                }

                interaction.editReply({
                    embeds: [errEmbed.setDescription(`\`❌\` | No playlist found named **${playlist}**`)]
                })

            }
                break;
        }

    }
})