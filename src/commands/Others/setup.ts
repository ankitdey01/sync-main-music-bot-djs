import { CustomClient, SlashCommand, reply, editReply } from "../../structure/index.js"
import { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits, Guild, ChatInputCommandInteraction, GuildChannel, CategoryChannel, BaseGuildTextChannel, OverwriteType } from "discord.js"
import DB, { MusicChannelDocument } from "../../schemas/musicchannel.js"
import { panelbutton } from "../../systems/button.js"
import { getBackgroundAttachment, getBackgroundAttachmentUrl } from "../../utils/imageUtils.js"

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName("setup")
        .setDescription("Setup the sync music requesting channel")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName('create').setDescription('Setup the music channel')
        )
        .addSubcommand(sub =>
            sub.setName('delete').setDescription('Delete the current music channel')
        )
        .addSubcommand(sub =>
            sub.setName('info').setDescription('Check the current status of the music setup')
        ),
    category: "Others",
    voteOnly: true,
    async execute(interaction, client) {

        if (!interaction.guild?.members.me?.permissions.has(PermissionFlagsBits.ManageChannels)) return reply(
            interaction, "❌", `Missing permissions for \`ManageChannels\`.`, true
        )

        await interaction.deferReply()

        let data = await DB.findOne<MusicChannelDocument>({ Guild: interaction.guild?.id })

        switch (interaction.options.getSubcommand()) {
            case "create": {

                if (data) { //if there is data which means already used /setup create

                    const channel = await interaction.guild.channels.fetch(data.Channel) as BaseGuildTextChannel
                    if (channel) { //if there is data as well as the channel
                        //await interaction.deferReply({ ephemeral: true })
                        return editReply(interaction, "❌", `The music channel is already set on <#${channel.id}>`)
                    } else { //if there is data but not the channel

                        await data.deleteOne()
                        let newdata = await setupCreate(interaction, client)
                        return editReply(interaction, "✅", `Successfully created the music setup in <#${newdata?.Channel}>`)
                    }

                } else { // if there is no data i.e no setup created

                    //await interaction.deferReply()
                    let newdata = await setupCreate(interaction, client)

                    editReply(interaction, "✅", `Successfully created the music setup in <#${newdata?.Channel}>`)
                }
            }

                break;

            case "delete": {

                if (!data) { // if there is no data to delete

                    //await interaction.deferReply({ ephemeral: true })
                    return editReply(interaction, "❌", "No music setup found for this server")

                } else { // if data found to be deleted

                    //await interaction.deferReply()

                    try { // tries to delete those channels
                        const channel = await interaction.guild.channels.fetch(data.Channel) as GuildChannel
                        const vc = await interaction.guild.channels.fetch(data.VoiceChannel) as GuildChannel
                        if (!channel && !vc) return
                        let parent: CategoryChannel
                        if (channel && !vc) parent = channel.parent as CategoryChannel
                        else if (vc && !channel) parent = vc.parent as CategoryChannel
                        else parent = channel.parent as CategoryChannel

                        if (channel.deletable) await channel.delete()
                        if (vc.deletable) await vc?.delete()
                        if (parent?.deletable) await parent?.delete()

                    } catch (error) { }

                    await data.deleteOne()
                    editReply(interaction, "✅", "Successfully deleted the music setup for this server")
                }
            }
                break;

            case "info": {

                //await interaction.deferReply()

                let status: string, vcStatus: string

                if (data && await interaction.guild.channels.fetch(data?.Channel)) status = 'Enabled'
                else status = 'Disabled'
                if (data && await interaction.guild.channels.fetch(data?.VoiceChannel)) vcStatus = 'Enabled'
                else vcStatus = 'Disabled'

                const Embed = new EmbedBuilder()
                    .setColor(status === 'Enabled' ? 'Green' : 'DarkRed')
                    .setDescription(`
                    **Current Status**: \`${status}\`\
                    \n\n**Music Channel**: ${status === 'Enabled' ? `<#${data?.Channel}>` : '\`No Channel\`'}\
                    \n\n**Voice Channel**: ${vcStatus === 'Enabled' ? `<#${data?.VoiceChannel}>` : '\`No Channel\`'}\
                `)
                    .setTitle(`__Music Setup Status__`)
                    .setThumbnail(interaction.guild.iconURL())
                    .setTimestamp()
                    .setFooter({ text: `${status}` })

                interaction.editReply({
                    embeds: [Embed]
                })

            }
                break;
        }
    }
})

async function setupCreate(interaction: ChatInputCommandInteraction, client: CustomClient) {

    const parent = await interaction.guild?.channels.create({
        name: `${client.user?.username.toLowerCase()} zone`,
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
            {
                type: OverwriteType.Role,
                id: interaction.guild?.roles.cache.find((x) => x.name === "@everyone")?.id as string,
                allow: [
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.EmbedLinks,
                ],
            },
            {
                type: OverwriteType.Member,
                id: client.user?.id as string,
                allow: [
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.Connect,
                    PermissionFlagsBits.EmbedLinks,
                    PermissionFlagsBits.Speak
                ]
            },
        ],
    })

    const textChannel = await interaction.guild?.channels.create({
        name: `music-request`,
        type: ChannelType.GuildText,
        parent: parent?.id,
        permissionOverwrites: [
            {
                type: OverwriteType.Role,
                id: interaction.guild.roles.cache.find((x) => x.name === "@everyone")?.id as string,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.ReadMessageHistory
                ],
                deny: [
                    PermissionFlagsBits.SendMessages,
                ]
            },
            {
                type: OverwriteType.Member,
                id: client.user?.id as string,
                allow: [
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.EmbedLinks,
                ]
            },
        ],

    })

    const voiceChannel = await interaction.guild?.channels.create({
        name: `${client.user?.username}`,
        type: ChannelType.GuildVoice,
        userLimit: 25,
        parent: parent?.id,
        permissionOverwrites: [
            {
                type: OverwriteType.Role,
                id: interaction.guild?.roles.cache.find((x) => x.name === "@everyone")?.id as string,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.Connect,
                ],
                deny: [
                    PermissionFlagsBits.Speak
                ]
            },
            {
                type: OverwriteType.Member,
                id: client.user?.id as string,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.Connect,
                    PermissionFlagsBits.Speak
                ]
            },

        ],

    })

    let title: string, image: string
    const player = client.kazagumo.getPlayer(interaction.guild?.id as string)

    if (player && player.playing && player.queue.current) {
        title = player.queue.current.title || "Unknown track"
        image = player.queue.current.thumbnail || getBackgroundAttachmentUrl();
    } else {
        title = `No song playing currently`
        image = getBackgroundAttachmentUrl()
    }

    let mainEmbed = new EmbedBuilder()
        .setColor(client.color)
        .setTitle(`${title}`)
        .setImage(`${image}`)
        .setDescription(
            `**[Invite Me](${client.data.links.invite})  :  [Support Server](${client.data.links.support})  :  [Vote Me](${client.data.topgg.vote})**`
        )

    const backgroundAttachment = player?.queue.current?.thumbnail ? null : getBackgroundAttachment();
    const files = backgroundAttachment ? [backgroundAttachment] : [];

    const panel = await textChannel?.send({
        embeds: [mainEmbed],
        components: [panelbutton], files: player?.queue.current?.thumbnail ? [] : (backgroundAttachment ? [backgroundAttachment] : [])
    })

    let data = await new DB({
        Guild: interaction.guild?.id,
        Channel: textChannel?.id,
        VoiceChannel: voiceChannel?.id,
        Message: panel?.id
    }).save() as MusicChannelDocument

    return data
}