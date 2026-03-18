import { BaseGuildTextChannel, ButtonInteraction, EmbedBuilder, Events } from "discord.js"
import { Event, CustomClient, memberVoice, botVC, differentVoice, editReply, reply } from "../../structure/index.js"
import wait from "node:timers/promises"
import buttonDB, { TempButtonSchema } from "../../schemas/tempbutton.js"
import setupDB from "../../schemas/musicchannel.js"
import { musicSetupUpdate } from "../../structure/index.js"
import { buttonDisable } from "../../systems/button.js"
import { getBackgroundAttachment, getBackgroundAttachmentUrl } from "../../utils/imageUtils.js"

export default new Event({
    name: Events.InteractionCreate,

    async execute(interaction: ButtonInteraction, client: CustomClient): Promise<any> {

        if (!interaction.isButton()) return
        if (!["vol-up", "vol-down", "pause-resume-song", "skip-song", "stop-song"].includes(interaction.customId)) return

        if (await memberVoice(interaction)) return
        if (await botVC(interaction)) return
        if (await differentVoice(interaction)) return

        const player = client.kazagumo.getPlayer(interaction.guild?.id as string)
        if (!player) return reply(interaction, "❌", "No song player was found", true)

        switch (interaction.customId) {
            case "vol-up": {

                if (player.volume >= 100) return reply(interaction, "❌", "The volume can't be increased further!", true)

                await interaction.deferReply().catch(() => { })

                await player.setVolume(player.volume + 10)

                editReply(interaction, "🔊", `The volume has been set to ${player.volume}`)
                await wait.setTimeout(1000)
                interaction.deleteReply()

            }
                break;
            case "vol-down": {

                if (player.volume <= 0) return reply(interaction, "❌", "The volume can't be decreased further!", true)

                await interaction.deferReply().catch(() => { })

                await player.setVolume(player.volume - 10)

                editReply(interaction, "🔉", `The volume has been set to ${player.volume}`)
                await wait.setTimeout(1000)
                interaction.deleteReply()

            }
                break;
            case "pause-resume-song": {

                await interaction.deferReply().catch(() => { })

                if (player.paused) {
                    player.pause(false)

                    editReply(interaction, "▶", "The player has been resumed")

                    await wait.setTimeout(1000)
                    interaction.deleteReply()

                } else {
                    player.pause(true)

                    editReply(interaction, "⏸", "The player has been paused")

                    await wait.setTimeout(1000)
                    interaction.deleteReply()

                }

            }
                break;
            case "skip-song": {

                await interaction.deferReply().catch(() => { })

                player.skip()

                editReply(interaction, "⏭", "The current track has been skipped")
                await wait.setTimeout(1000)
                interaction.deleteReply()

            }
                break;
            case "stop-song": {

                await interaction.deferReply().catch(() => { })

                const data = await buttonDB.find<TempButtonSchema>({ Guild: player.guildId, Channel: player.textId }).catch(err => { })

                if (!player.textId) return
                if(player.state == 1) player.disconnect()

                editReply(interaction, "⏹", "The player has been stopped")
                await wait.setTimeout(1000)
                interaction.deleteReply()

                const Channel = await client.channels.fetch(player.textId).catch(() => { })
                if(player.state == 1) player.disconnect()
                player.destroy()
                for (let i = 0; i < (data as TempButtonSchema[]).length; i++) {
                    const msg = await (Channel as BaseGuildTextChannel).messages.fetch((data as TempButtonSchema[])[i].MessageID).catch(() => { })
                    if (msg && msg.editable) await msg.edit({ components: [buttonDisable] })
                    await (data as TempButtonSchema[])[i].deleteOne()
                }

                const setupUpdateEmbed = new EmbedBuilder()
                    .setColor(client.color)
                    .setTitle(`No song playing currently`)
                    .setImage(getBackgroundAttachmentUrl())
                    .setDescription(
                        `**[Invite Me](${client.data.links.invite})  :  [Support Server](${client.data.links.support})  :  [Vote Me](${client.data.topgg.vote})**`
                    )

                await musicSetupUpdate(client, player, setupDB, setupUpdateEmbed, (getBackgroundAttachment() ? [getBackgroundAttachment()] : []))
            }
                break;
        }
    },
})