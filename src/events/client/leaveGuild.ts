import { EmbedBuilder, Events, Guild } from "discord.js"
import { CustomClient, Event, log } from "../../structure/index.js";

export default new Event({
    name: Events.GuildDelete,
    async execute(guild: Guild, client: CustomClient) {

        const Embed = new EmbedBuilder()
            .setAuthor({ name: `Removed from - ${guild.name}`, iconURL: guild.iconURL() || client.user?.displayAvatarURL() as string })
            .setThumbnail(guild.iconURL() || client.user?.displayAvatarURL() as string)
            .setTimestamp()
            .setColor("DarkRed")
            .setDescription(`\`\`\`Name: ${guild.name}\
                    \nID: ${guild.id}\
                    \nOwner: ${guild.ownerId}\
                    \nMembers: ${guild.memberCount}\`\`\``)
            .setFooter({ text: `Total - ${client.guilds.cache.size}` })

        log(client, Embed, client.data.devBotEnabled ? client.data.dev.webhook.guild : client.data.prod.webhook.guild)
    }
})