import mongoose, { Document } from "mongoose";

export interface DailyPlaysSchema extends Document {

    User: string;
    Date: Date;
    Count: number;
    // true = verified voter, false = verified non-voter,
    // null = Top.gg verification failed (fail-open: don't count)
    Voted: boolean | null;

}

const dailyPlaysSchema = new mongoose.Schema({

    User: { type: String, required: true },
    Date: { type: Date, required: true },
    Count: { type: Number, required: true, default: 0 },
    Voted: { type: Boolean, default: false }

}, { autoIndex: false })

// Unique bucket per user per UTC day (Date is always UTC midnight).
dailyPlaysSchema.index({ User: 1, Date: 1 }, { unique: true })
// TTL: Mongo deletes the doc 2 days after its Date (midnight). Keeps today +
// yesterday as buffer, drops day-before-yesterday automatically. Server-side,
// no timer code, no bot RAM.
dailyPlaysSchema.index({ Date: 1 }, { expireAfterSeconds: 2 * 24 * 60 * 60 })

const dailyDB = mongoose.model<DailyPlaysSchema>("userDailyPlays", dailyPlaysSchema)
export default dailyDB

function mergeVoted(values: Array<boolean | null | undefined>, fallback: boolean | null = null): boolean | null {
    if (values.some((v) => v === true)) return true;
    if (values.some((v) => v === false)) return false;
    return fallback;
}

// One-time migration: legacy docs stored Date as "YYYY-MM-DD" string. TTL
// only fires on BSON Dates, so convert each to UTC midnight and merge into
// any existing doc for the same User+day (sum Count, true > false > null).
async function migrateStringDates(): Promise<void> {
    const col = dailyDB.collection;
    const legacy = await col.find({ Date: { $type: "string" } }).toArray();
    for (const doc of legacy) {
        const day = String((doc as any).Date);
        const midnight = new Date(`${day}T00:00:00.000Z`);
        if (Number.isNaN(midnight.getTime())) {
            await col.deleteOne({ _id: (doc as any)._id });
            continue;
        }
        const existing = await col.findOne({ User: (doc as any).User, Date: midnight });
        if (existing && String((existing as any)._id) !== String((doc as any)._id)) {
            const mergedCount = (Number((existing as any).Count) || 0) + (Number((doc as any).Count) || 0);
            const mergedVoted = mergeVoted([(existing as any).Voted, (doc as any).Voted], (existing as any).Voted ?? null);
            await col.updateOne({ _id: (existing as any)._id }, { $set: { Count: mergedCount, Voted: mergedVoted } });
            await col.deleteOne({ _id: (doc as any)._id });
        } else {
            await col.updateOne({ _id: (doc as any)._id }, { $set: { Date: midnight } });
        }
    }
}

// Collapse duplicate User+Date records (summing Count, merging Voted), then
// build the unique + TTL indexes. Runs once per process, on connect. Throws
// on failure so startup stops instead of running limits on bad indexes.
export async function ensureDailyPlaysIndex(): Promise<void> {
    const col = dailyDB.collection;
    try {
        await migrateStringDates();

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
            const mergedVoted = mergeVoted(docs.map((d: any) => d.Voted), (canonical as any).Voted ?? null);
            await col.updateOne({ _id: (canonical as any)._id }, { $set: { Count: mergedCount, Voted: mergedVoted } });
            if (restIds.length > 0) await col.deleteMany({ _id: { $in: restIds } });
        }

        await col.createIndex({ User: 1, Date: 1 }, { unique: true });
        await col.createIndex({ Date: 1 }, { expireAfterSeconds: 2 * 24 * 60 * 60 });
    } catch (error) {
        console.error("Failed to prepare userDailyPlays unique index:", error);
        throw error;
    }
}
