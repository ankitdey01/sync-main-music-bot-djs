import mongoose, { Document } from "mongoose";

// Snapshot of the most recent track, kept so the setup panel can render a
// "Last Played" state after playback stops (or the bot is disconnected).
export interface LastPlayedSchema {
    Title: string;
    Author: string;
    Identifier: string;
    Thumbnail?: string;
}

export interface MusicChannelSchema {
    Guild: string;
    Channel: string;
    VoiceChannel: string;
    Message: string;
    LastPlayed?: LastPlayedSchema;
}

export interface MusicChannelDocument extends MusicChannelSchema, Document {

}

// Dedicated sub-schema so LastPlayed stays optional overall while its own
// Title/Author/Identifier stay required when a snapshot exists. _id disabled:
// the snapshot is a plain embedded object, not its own document.
const lastPlayedSchema = new mongoose.Schema({
    Title: { type: String, required: true },
    Author: { type: String, required: true },
    Identifier: { type: String, required: true },
    Thumbnail: { type: String }
}, { _id: false })

export default mongoose.model<MusicChannelDocument>("musicChannel", new mongoose.Schema({

    Guild: { type: String, required: true},
    Channel: { type: String, required: true},
    VoiceChannel: { type: String, required: true},
    Message: { type: String, required: true},

    LastPlayed: { type: lastPlayedSchema, required: false }

}))
