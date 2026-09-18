import mongoose, { Document } from "mongoose";

export interface DailyPlaysSchema extends Document {

    User: string;
    Date: string;
    Count: number;
    // true = verified voter, false = verified non-voter,
    // null = Top.gg verification failed (fail-open: don't count)
    Voted: boolean | null;

}

const dailyPlaysSchema = new mongoose.Schema({

    User: { type: String, required: true },
    Date: { type: String, required: true },
    Count: { type: Number, required: true, default: 0 },
    Voted: { type: Boolean, default: false }

}, { autoIndex: false })

// Built manually by ensureDailyPlaysIndex() after startup deduplication -
// a unique index build fails when duplicates already exist.
dailyPlaysSchema.index({ User: 1, Date: 1 }, { unique: true })

const dailyDB = mongoose.model<DailyPlaysSchema>("userDailyPlays", dailyPlaysSchema)
export default dailyDB

// Collapse any pre-existing duplicate User+Date records (keeping the oldest of
// each pair), drop history older than yesterday (only today's counts are ever
// read; ISO dates compare correctly as strings), then build the unique index.
// Runs once per process, on connect. Throws on failure so startup can stop
// instead of running playback limits against unprepared indexes.
export async function ensureDailyPlaysIndex(): Promise<void> {
    const col = dailyDB.collection;
    try {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        await col.deleteMany({ Date: { $lt: yesterday } });

        const dupes = await col.aggregate([
            { $group: { _id: { User: "$User", Date: "$Date" }, ids: { $push: "$_id" }, total: { $sum: 1 } } },
            { $match: { total: { $gt: 1 } } }
        ]).toArray();

        for (const dupe of dupes) {
            // Consolidate each User/Date group into one canonical doc before
            // deleting the rest: sum Count and merge Voted (true wins, then
            // false, unknown null last) so no play history is silently dropped.
            const docs = await col.find({ _id: { $in: dupe.ids } }).toArray();
            if (docs.length === 0) continue;
            docs.sort((a: any, b: any) => String(a._id).localeCompare(String(b._id)));
            const canonical = docs[0];
            const restIds = docs.slice(1).map((d: any) => d._id);
            const mergedCount = docs.reduce((sum: number, d: any) => sum + (Number(d.Count) || 0), 0);
            const mergedVoted = docs.some((d: any) => d.Voted === true)
                ? true
                : docs.some((d: any) => d.Voted === false)
                    ? false
                    : (canonical as any).Voted ?? null;
            await col.updateOne({ _id: (canonical as any)._id }, { $set: { Count: mergedCount, Voted: mergedVoted } });
            if (restIds.length > 0) await col.deleteMany({ _id: { $in: restIds } });
        }

        await col.createIndex({ User: 1, Date: 1 }, { unique: true });
    } catch (error) {
        console.error("Failed to prepare userDailyPlays unique index:", error);
        throw error;
    }
}
