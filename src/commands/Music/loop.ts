import { SlashCommandBuilder } from "discord.js";
import { SlashCommand, memberVoice, botVC, differentVoice, reply, editReply } from "../../structure";

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Loop the current song or queue')
        .addStringOption(opt =>
            opt.setName('mode')
                .setDescription('Configure the loop settings')
                .setRequired(true)
                .addChoices({
                    name: "Track",
                    value: "track"
                },
                {
                    name: "Queue",
                    value: "queue"
                },
                {
                    name: "Disable",
                    value: "off"
                })
        ),
    category: "Music",
    voteOnly: true,
    async execute(interaction, client) {

        if (await memberVoice(interaction)) return
        if (await botVC(interaction)) return
        if (await differentVoice(interaction)) return

        const player = client.kazagumo.getPlayer(interaction.guild?.id as string)
        if (!player) return reply(interaction, "❌", "No song player was found", true)

        const mode = interaction.options.getString("mode", true) as "track" | "queue" | "off";
        
        const loopMode = mode === "off" ? "none" : mode;
        
        if (player.loop === loopMode) return reply(interaction, "❌", 
            mode === "track" ? "This song is already being looped" :
            mode === "queue" ? "The queue is already being looped" :
            "The loop mode is already disabled", true
        );

        await interaction.deferReply();
        player.setLoop(loopMode);

        const messages = {
            track: "**Looping** the current track",
            queue: "Looping the queue",
            off: "The loop mode has been disabled"
        };

        editReply(interaction, mode === "off" ? "✅" : "🔄", messages[mode]);
    }
});
