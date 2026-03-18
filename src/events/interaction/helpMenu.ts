import { StringSelectMenuInteraction, EmbedBuilder, Events } from "discord.js";
import { CustomClient, Event } from "../../structure/index.js";
import emojis from "../../systems/emojis.js";

export default new Event({
    name: Events.InteractionCreate,
    async execute(interaction: StringSelectMenuInteraction, client: CustomClient) {

        if (!interaction.isStringSelectMenu()) return
        if (interaction.customId !== "helpMenu") return

        const selection = interaction.values[0]

        const Sub = `__Command category for ${selection} commands__`

        let Embed

        switch (selection) {
            case "Filter": {

                const MappedData = `\`filter nightcore\`\nApplies a nightcore filter\
            \n\n\`filter vaporwave\`\nApplies a vaporwave filter\
            \n\n\`filter bassboost\`\nApplies a bassboost filter\
            \n\n\`filter pop\`\nApplies a pop filter\
            \n\n\`filter soft\`\nApplies a soft filter\
            \n\n\`filter treblebass\`\nApplies a treblebass filter\
            \n\n\`filter 8d\`\nApplies a 8D filter\
            \n\n\`filter karaoke\`\nApplies a karaoke filter\
            \n\n\`filter vibrato\`\nApplies a vibrato filter\
            \n\n\`filter tremelo\`\nApplies a tremelo filter\
            \n\n\`filter clear\`\nClears the applied filter\
            `

                Embed = new EmbedBuilder()
                    .setTitle(`${selection} Commands`)
                    .setDescription(`${Sub}\n\n${MappedData}`)
                    .setColor(client.color)
                    .setThumbnail(`${client.user?.displayAvatarURL()}`)
                    .setFooter({ text: `${client.user?.username}`, iconURL: client.user?.displayAvatarURL() })
                    .setTimestamp()

            }

                break;

            case "Home": {

                const Intro = `**Hey ${interaction.user.username}, it's me Sync Music.\nI offer non-stop playback of your favorite tunes with customizable filters to fit your taste.\nChoose me for all of your music needs.**\n\n`
                const Features = `**My Command Categories:\n\n${emojis.music} | Music Commands\n${emojis.info} | General Commands\n${emojis.filter} | Filter\n${emojis.settings} | Others\n\n**`
                const Last = `\`Choose a category from below\``
                const Promo = `\n\n**[Invite Me](${client.data.links.invite})  :  [Support Server](${client.data.links.support})  :  [Vote Me](${client.data.topgg.vote})**`

                Embed = new EmbedBuilder()
                    .setAuthor({ name: `${client.user?.username}`, iconURL: client.user?.displayAvatarURL() })
                    .setColor(client.color)
                    .setDescription(`${Intro}${Features}${Last}${Promo}`)
                    .setFooter({ text: `${client.user?.username}`, iconURL: client.user?.displayAvatarURL() })
                    .setThumbnail(`${client.user?.displayAvatarURL()}`)

            }

                break;

            case "Playlist": {

                const MappedData = `\`playlist create\`\nCreate a music playlist\
            \n\n\`playlist delete\`\nDelete a playlist\
            \n\n\`playlist info\`\nShows info about your playlist\
            \n\n\`playlist list\`\nShows all of your created playlist\
            \n\n\`playlist play\`\nPlay songs from your playlist\
            \n\n\`playlist add\`\nAdd a song to your playlist\
            \n\n\`playlist remove\`\nRemove a song from your playlist\
            \n\n\`playlist current\`\nSave the current playing song to your playlist\
            `

                Embed = new EmbedBuilder()
                    .setTitle(`${selection} Commands`)
                    .setDescription(`${Sub}\n\n${MappedData}`)
                    .setColor(client.color)
                    .setThumbnail(`${client.user?.displayAvatarURL()}`)
                    .setFooter({ text: `${client.user?.username}`, iconURL: client.user?.displayAvatarURL() })
                    .setTimestamp()

            }

                break;

            default: {

                const Sorted = client.commands.filter(v => v.category === `${selection}`)
                const MappedData = Sorted.map(value => `\`${value.data.name}\`\n${value.data.description}`).join("\n\n")

                Embed = new EmbedBuilder()
                    .setTitle(`${selection} Commands`)
                    .setDescription(`${Sub}\n\n${MappedData}`)
                    .setColor(client.color)
                    .setThumbnail(`${client.user?.displayAvatarURL()}`)
                    .setFooter({ text: `${client.user?.username}`, iconURL: client.user?.displayAvatarURL() })
                    .setTimestamp()

            }

                break;
        }

        interaction.message.edit({ embeds: [Embed] })

        await interaction.deferUpdate()

    },
})