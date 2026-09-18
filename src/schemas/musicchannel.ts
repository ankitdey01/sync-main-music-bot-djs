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

export default mongoose.model<MusicChannelDocument>("musicChannel", new mongoose.Schema({

    Guild: { type: String, required: true},
    Channel: { type: String, required: true},
    VoiceChannel: { type: String, required: true},
    Message: { type: String, required: true},

    LastPlayed: {
        Title: { type: String, required: true },
        Author: { type: String, required: true },
        Identifier: { type: String, required: true },
        Thumbnail: { type: String }
    }

}))
