import dailyDB from "../../schemas/dailyplays.js";

export function todayUTC(): string {
    return new Date().toISOString().slice(0, 10);
}

// Fetch (or lazily create) the user's daily-plays doc for the given UTC day.
// Filtering on the date means a doc from a previous day never matches and a
// fresh one with Count: 0 is created - that is the daily reset. Pass todayUTC()
// once from the caller when the date is reused afterwards, so a UTC-midnight
// crossing mid-flow can't split the read and the writes across two days.
export async function getDailyPlaysDoc(userId: string, date: string = todayUTC()) {
    return dailyDB.findOneAndUpdate(
        { User: userId, Date: date },
        { $setOnInsert: { User: userId, Date: date, Count: 0, Voted: false } },
        { upsert: true, returnDocument: "after" }
    );
}
