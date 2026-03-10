<div align="center">

# 🎵 Sync Music Bot (WITH OVER 2K+ ACTIVE SERVERS)🎵

### *Your Ultimate Discord Music Companion — Powered by discord.js v14*

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue?style=for-the-badge)](LICENSE)
[![Stars](https://img.shields.io/github/stars/ankitdey01/sync-main-music-bot-djs?style=for-the-badge&color=yellow)](https://github.com/ankitdey01/sync-main-music-bot-djs/stargazers)

---

> 🎧 *Non-stop playback of your favorite tunes with customizable filters to fit your taste.*

</div>

---

## 🌟 What is Sync Music?

**Sync Music** is a feature-rich, fully-typed **Discord music bot** built with **TypeScript** and **discord.js v14**. It uses **Lavalink** via `erela.js` for flawless audio streaming, supports multiple music platforms, and comes packed with playlist management, audio filters, interactive buttons, and more!

---

## ✨ Features

| 🎶 Feature | 📝 Description |
|---|---|
| 🎵 **Multi-Platform Playback** | Stream music from YouTube, Spotify, Deezer, Apple Music & Facebook |
| 🔁 **Loop Modes** | Loop a single track or the entire queue |
| 📋 **Queue Management** | View, clear, and manage your song queue |
| ⏭️ **Skip / Back** | Skip ahead or go back to the previous song |
| ⏩ **Seek / Forward** | Jump forward by a specific number of seconds |
| 🔊 **Volume Control** | Raise or lower volume with interactive buttons |
| ⏯️ **Pause & Resume** | Full playback control at your fingertips |
| 🎛️ **Audio Filters** | Customize your listening experience |
| 📜 **Playlists** | Create, manage, and share personal playlists |
| 📩 **Grab Song** | DM yourself the currently playing track |
| 🧹 **Clear Queue** | Wipe the queue in a single command |
| 🪄 **Now Playing** | Display rich embeds showing current track info |
| 👤 **User Profile** | Track songs played and time listened |
| 🔘 **Interactive Buttons** | Control music directly from Discord buttons |
| 🗳️ **Top.gg Integration** | Vote-locked premium features |

---

## 🎼 Command Categories

- 🎵 **Music** — `play`, `skip`, `back`, `pause`, `stop`, `loop`, `queue`, `clearqueue`, `forward`, `replay`, `now-playing`, `grab`, and more!
- ℹ️ **General** — `help`, `vote`, `ping`, and more!
- 🎛️ **Filter** — Audio filter commands
- 📁 **Playlist** — Personal playlist management
- ⚙️ **Others** — `profile` and utility commands

---

## 🚀 Getting Started

### 📋 Prerequisites

Before you begin, make sure you have:

- 🟢 **Node.js** v16.9.0 or higher
- 🔧 **TypeScript** installed (`npm i -g typescript`)
- 🎵 A running **Lavalink** server
- 🍃 A **MongoDB** connection string
- 🤖 A **Discord Bot Token** from the [Discord Developer Portal](https://discord.com/developers/applications)
- 📊 A **Spotify App** (Client ID & Secret) from the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

---

### ⚙️ Installation

```bash
# 1️⃣ Clone the repository
git clone https://github.com/ankitdey01/sync-main-music-bot-djs.git

# 2️⃣ Navigate into the project
cd sync-main-music-bot-djs

# 3️⃣ Install dependencies
npm install

# 4️⃣ Configure the bot (see Configuration section below)

# 5️⃣ Build and start
npm start
```

---

### 🔧 Configuration

Edit `src/config.ts` and fill in your credentials:

```ts
export default {
    prod: {
        token: "YOUR_DISCORD_BOT_TOKEN",    // 🤖 Bot Token
        id:    "YOUR_BOT_CLIENT_ID",         // 🆔 Client ID
        db:    "YOUR_MONGODB_URI",           // 🍃 MongoDB URI
    },
    spotify: {
        id:     "YOUR_SPOTIFY_CLIENT_ID",    // 🎵 Spotify ID
        secret: "YOUR_SPOTIFY_SECRET",       // 🔑 Spotify Secret
    },
    links: {
        invite:  "YOUR_INVITE_LINK",         // 📨 Invite URL
        support: "YOUR_SUPPORT_SERVER",      // 💬 Support Server
    },
    topgg: {
        token: "YOUR_TOPGG_TOKEN",           // 🗳️ Top.gg Token
        vote:  "YOUR_TOPGG_VOTE_LINK",       // 🔗 Vote URL
    },
    color: "Blue"                            // 🎨 Embed Color
}
```

Configure your **Lavalink nodes** in `src/systems/nodes.ts`:

```ts
{
    host: "your-lavalink-host",
    port: 2333,
    password: "your-password",
}
```

---

## 🏗️ Project Structure

```
📦 sync-main-music-bot-djs
├── 📁 src/
│   ├── 📁 commands/
│   │   ├── 🎵 Music/       # Music commands
│   │   ├── ℹ️  General/     # General commands
│   │   ├── 🎛️  Filter/      # Audio filters
│   │   ├── 📁 Playlist/    # Playlist commands
│   │   └── ⚙️  Others/      # Utility commands
│   ├── 📁 events/          # Discord & player events
│   ├── 📁 schemas/         # MongoDB schemas
│   ├── 📁 systems/         # Core systems (buttons, nodes, emojis)
│   ├── 📁 structure/       # Custom client & base classes
│   ├── 📄 config.ts        # Bot configuration
│   └── 📄 index.ts         # Entry point
├── 📁 dist/                # Compiled JavaScript output
├── 📄 package.json
├── 📄 tsconfig.json
└── 📄 LICENSE
```

---

## 📦 Tech Stack

| 📦 Package | 🔖 Version | 💡 Purpose |
|---|---|---|
| `discord.js` | v14 | 🤖 Discord API wrapper |
| `erela.js` | ^2.4.0 | 🎵 Lavalink client |
| `erela.js-spotify` | ^1.2.0 | 🟢 Spotify support |
| `erela.js-deezer` | ^1.0.7 | 🟠 Deezer support |
| `better-erela.js-apple` | ^1.0.5 | 🍎 Apple Music support |
| `erela.js-filters` | ^1.2.7 | 🎛️ Audio filters |
| `erela.js-facebook` | ^1.0.4 | 🔵 Facebook support |
| `mongoose` | ^6.8.0 | 🍃 MongoDB ODM |
| `discord-arts` | ^0.3.6 | 🎨 Profile image rendering |
| `@top-gg/sdk` | ^3.1.5 | 🗳️ Top.gg integration |
| `youtube-sr` | ^4.3.4 | 📺 YouTube search |
| `typescript` | ^4.9.5 | 🔷 Type safety |

---

## 📜 License

This project is licensed under the **GNU General Public License v3.0**.
See the [LICENSE](LICENSE) file for details.

---

## 🌐 Links

<div align="center">

[![Invite Bot](https://img.shields.io/badge/➕_Invite_Bot-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/oauth2/authorize?client_id=1050725403276353557&permissions=36988944&scope=bot+applications.commands)
[![Support Server](https://img.shields.io/badge/💬_Support_Server-5865F2?style=for-the-badge&logo=discord&logoColor=white)]([#](https://discord.gg/UVk7mJTyQX))
[![Vote on Top.gg](https://img.shields.io/badge/🗳️_Vote_on_Top.gg-FF3366?style=for-the-badge&logo=data:image/svg+xml;base64,...&logoColor=white)](https://top.gg/bot/1050725403276353557/vote)

</div>

---

<div align="center">

Made with ❤️ by [**Ankitzz**](https://github.com/ankitdey01)

⭐ *If you like this project, please give it a star!* ⭐

</div>
