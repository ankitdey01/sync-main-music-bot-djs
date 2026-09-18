import { ChannelType, EmbedBuilder, PermissionFlagsBits, BaseGuildTextChannel, TextChannel } from "discord.js";
import { KazagumoPlayer } from "kazagumo";
import { CustomClient, ShoukakuEvent, log } from "../../structure/index.js";

export default new ShoukakuEvent({
    name: "playerException",
    async execute(player: KazagumoPlayer, data: any, client: CustomClient) {

        if (!player.textId) return;
        if (!client.channels) return;

        const channel = await client.channels.fetch(player.textId).catch(() => null) as BaseGuildTextChannel;
        if (!channel) return;
        if (channel.type !== ChannelType.GuildText) return;
        if (!channel.guild?.members.me?.permissionsIn(channel as TextChannel).has(PermissionFlagsBits.SendMessages)) return;

        const track = player.queue.current ?? player.queue.previous[0];
        const rawReason = data?.exception?.message || "Unknown error";

        // Strip the java stack trace noise — keep only the client failure reasons
        const reason = String(rawReason)
            .split("\n")
            .filter(line => {
                const t = line.trim();
                if (!t) return false;
                if (t.startsWith("at ")) return false; // stack frames
                return true;
            })
            .map(line => line.trim())
            .filter((line, i, arr) => line !== "All clients failed to load the item." || i === 0)
            .join("\n");

        // Backticks inside the value would close the ``` fence below
        const fenceSafe = reason.replace(/```/g, "`\u200b`\u200b`");

        // User-facing embed - clean and simple
        const userEmbed = new EmbedBuilder()
            .setColor("Red")
            .setAuthor({
                name: "Track failed to load",
                iconURL: client.user?.displayAvatarURL()
            })
            .setDescription(
                [
                    `Could not play **${track?.title ?? "the current track"}**.`,
                    "",
                    "It was skipped and the next track (if any) will play."
                ].join("\n")
            );

        await channel.send({ embeds: [userEmbed] }).catch(() => { });

        // Log detailed error to the error webhook
        const logEmbed = new EmbedBuilder()
            .setColor("Red")
            .setTitle("Player Exception")
            .addFields(
                { name: "Track", value: track?.title ?? "Unknown", inline: false },
                { name: "Guild", value: `${channel.guild.name} (${channel.guild.id})`, inline: false },
                { name: "Channel", value: `${channel.name} (${channel.id})`, inline: false },
                { name: "Error Details", value: "```" + fenceSafe.slice(0, 1000) + "```", inline: false }
            )
            .setTimestamp();

        await log(
            client,
            logEmbed,
            client.data.devBotEnabled ? client.data.dev.webhook.error : client.data.prod.webhook.error
        );
    }
});
