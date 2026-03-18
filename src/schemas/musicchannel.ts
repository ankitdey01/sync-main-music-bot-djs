import mongoose, { Document } from "mongoose";

export interface MusicChannelSchema {
    Guild: string;
    Channel: string;
    VoiceChannel: string;
    Message: string;
}

export interface MusicChannelDocument extends MusicChannelSchema, Document {
    
}

export default mongoose.model<MusicChannelDocument>("musicChannel", new mongoose.Schema({

    Guild: { type: String, required: true},
    Channel: { type: String, required: true},
    VoiceChannel: { type: String, required: true},
    Message: { type: String, required: true}
    
}))