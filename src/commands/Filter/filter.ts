import { SlashCommandBuilder } from "discord.js";
import { SlashCommand, memberVoice, botVC, differentVoice, reply, editReply } from "../../structure/index.js";

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('filter')
        .setDescription('Apply audio filters to the player')
        .addStringOption(opt =>
            opt.setName('type')
                .setDescription('The filter to apply')
                .setRequired(true)
                .addChoices(
                    { name: "Clear", value: "clear" },
                    { name: "Bassboost", value: "bassboost" },
                    { name: "Nightcore", value: "nightcore" },
                    { name: "Vaporwave", value: "vaporwave" },
                    { name: "Pop", value: "pop" },
                    { name: "Soft", value: "soft" },
                    { name: "Treblebass", value: "treblebass" },
                    { name: "Eight Dimension", value: "eightd" },
                    { name: "Karaoke", value: "karaoke" },
                    { name: "Vibrato", value: "vibrato" },
                    { name: "Tremolo", value: "tremolo" }
                )
        ),
    category: "Music",
    voteOnly: true,
    async execute(interaction, client) {
        // Check validation conditions before deferring
        if (await memberVoice(interaction)) return
        if (await botVC(interaction)) return
        if (await differentVoice(interaction)) return

        const player = client.kazagumo.getPlayer(interaction.guild?.id as string)
        if (!player) return reply(interaction, "❌", "No song player was found", true)

        // Defer the reply after validation passes
        await interaction.deferReply()

        const filterType = interaction.options.getString("type", true)

        try {
            // Access the underlying Shoukaku player for filter operations
            const shoukakuPlayer = player.shoukaku

            switch(filterType) {
                case "clear":
                    await shoukakuPlayer.clearFilters()
                    break;
                case "bassboost":
                    await shoukakuPlayer.setFilters({
                        equalizer: [
                            { band: 0, gain: 0.6 },
                            { band: 1, gain: 0.7 },
                            { band: 2, gain: 0.8 },
                            { band: 3, gain: 0.55 },
                            { band: 4, gain: 0.25 },
                            { band: 5, gain: -0.05 },
                            { band: 6, gain: -0.15 },
                            { band: 7, gain: -0.2 },
                            { band: 8, gain: -0.25 },
                            { band: 9, gain: -0.3 },
                            { band: 10, gain: -0.35 },
                            { band: 11, gain: -0.4 },
                            { band: 12, gain: -0.45 },
                            { band: 13, gain: -0.5 },
                            { band: 14, gain: -0.55 }
                        ]
                    })
                    break;
                case "nightcore":
                    await shoukakuPlayer.setFilters({
                        timescale: { speed: 1.2, pitch: 1.2, rate: 1.0 }
                    })
                    break;
                case "vaporwave":
                    await shoukakuPlayer.setFilters({
                        equalizer: [
                            { band: 0, gain: 0.1 },
                            { band: 1, gain: 0.2 },
                            { band: 2, gain: 0.3 },
                            { band: 3, gain: 0.4 },
                            { band: 4, gain: 0.5 }
                        ],
                        timescale: { speed: 0.8, pitch: 0.8, rate: 1.0 }
                    })
                    break;
                case "pop":
                    await shoukakuPlayer.setFilters({
                        equalizer: [
                            { band: 0, gain: 0.2 },
                            { band: 1, gain: 0.4 },
                            { band: 2, gain: 0.6 },
                            { band: 3, gain: 0.4 },
                            { band: 4, gain: 0.2 }
                        ]
                    })
                    break;
                case "soft":
                    await shoukakuPlayer.setFilters({
                        equalizer: [
                            { band: 0, gain: -0.2 },
                            { band: 1, gain: -0.1 },
                            { band: 2, gain: 0.1 },
                            { band: 3, gain: 0.2 },
                            { band: 4, gain: 0.3 }
                        ],
                        lowPass: { smoothing: 20 }
                    })
                    break;
                case "treblebass":
                    await shoukakuPlayer.setFilters({
                        equalizer: [
                            { band: 0, gain: 0.6 },
                            { band: 1, gain: 0.67 },
                            { band: 2, gain: 0.67 },
                            { band: 3, gain: 0 },
                            { band: 4, gain: -0.5 },
                            { band: 5, gain: 0.15 },
                            { band: 6, gain: -0.45 },
                            { band: 7, gain: 0.23 },
                            { band: 8, gain: 0.35 },
                            { band: 9, gain: 0.45 },
                            { band: 10, gain: 0.55 },
                            { band: 11, gain: 0.6 },
                            { band: 12, gain: 0.6 },
                            { band: 13, gain: 0.5 },
                            { band: 14, gain: 0.4 }
                        ]
                    })
                    break;
                case "eightd":
                    await shoukakuPlayer.setFilters({
                        rotation: { rotationHz: 0.2 }
                    })
                    break;
                case "karaoke":
                    await shoukakuPlayer.setFilters({
                        karaoke: {
                            level: 1.0,
                            monoLevel: 1.0,
                            filterBand: 220.0,
                            filterWidth: 100.0
                        }
                    })
                    break;
                case "vibrato":
                    await shoukakuPlayer.setFilters({
                        vibrato: { frequency: 10, depth: 0.5 }
                    })
                    break;
                case "tremolo":
                    await shoukakuPlayer.setFilters({
                        tremolo: { frequency: 10, depth: 0.5 }
                    })
                    break;
            }

            return editReply(interaction, "🎵", `${filterType.charAt(0).toUpperCase() + filterType.slice(1)} filter will be applied soon!`)

        } catch (error) {
            console.error('Filter error:', error)
            return editReply(interaction, "❌", "Failed to apply filter. Please try again.")
        }
    }
});
