import dailyDB from "../../schemas/dailyplays.js";

export function todayUTC(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Fetch (or lazily create) the user's daily-plays doc for the given UTC day.
// Filtering on the date means a doc from a previous day never matches and a
// fresh one with Count: 0 is created - that is the daily reset. Pass todayUTC()
// once from the caller when the date is reused afterwards, so a UTC-midnight
// crossing mid-flow can't split the read and the writes across two days.
export async function getDailyPlaysDoc(userId: string, date: Date = todayUTC()) {
    return dailyDB.findOneAndUpdate(
        { User: userId, Date: date },
        { $setOnInsert: { User: userId, Date: date, Count: 0, Voted: false } },
        { upsert: true, returnDocument: "after" }
    );
}
