import { Message, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, Events } from "discord.js";
import fs from "fs";
import emojis from "../../systems/emojis";
import { CustomClient, Event } from "../../structure/index.js";

export default new Event({
    name: Events.MessageCreate,
    async execute(message: Message, client: CustomClient) {

        if (!client.user) return

        if (!message.guild || message.author.bot) return
        if (message.content.includes("@here") || message.content.includes("@everyone")) return
        if (!message.content.includes(client.user?.id)) return

        const Intro = `**Hey ${message.author.username}, it's me Sync Music.\nI offer non-stop playback of your favorite tunes with customizable filters to fit your taste.\nChoose me for all of your music needs.**\n\n`
        const Features = `**My Command Categories:\n\n${emojis.music} | Music Commands\n${emojis.info} | General Commands\n${emojis.filter} | Filter\n${emojis.playlist} | Playlist\n${emojis.settings} | Others\n\n**`
        const Last = `\`Choose a category from below\``
        const Promo = `\n\n**[Invite Me](${client.data.links.invite})  :  [Support Server](${client.data.links.support})  :  [Vote Me](${client.data.topgg.vote})**`

        const embedMsg = new EmbedBuilder()
            .setAuthor({ name: `${client.user?.username}`, iconURL: client.user?.displayAvatarURL() })
            .setColor(client.color)
            .setDescription(`${Intro}${Features}${Last}${Promo}`)
            .setFooter({ text: `${client.user?.username}`, iconURL: client.user?.displayAvatarURL() })
            .setThumbnail(`${client.user?.displayAvatarURL()}`)

        let helpMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("helpMenu")
                .setMaxValues(1)
                .setMinValues(1)
                .setPlaceholder("Browse categories")
        )

        const emojiss = {
            General: emojis.info,
            Music: emojis.music,
            Filter: emojis.filter,
            Others: emojis.settings,
            Playlist: emojis.playlist
        }

        fs.readdirSync("dist/commands").forEach((command: string) => {
            helpMenu.components[0].addOptions({
                label: `${command}`,
                description: `Command list for ${command}`,
                value: `${command}`,
                emoji: (emojiss as any)[command]
            })
        })

        helpMenu.components[0].addOptions({
            label: "Home",
            description: "Go back to the home page",
            value: "Home",
            emoji: emojis.home,
        })

        message.reply({ embeds: [embedMsg], components: [helpMenu] })
    }
})