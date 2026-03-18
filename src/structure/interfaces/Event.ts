import { ClientEvents } from "discord.js";

export class Event {
    public data: EventOptions;
    constructor(options: EventOptions) {
        this.data = options;
    }
}

export interface EventOptions {
    name: keyof ClientEvents | null;
    once?: boolean;
    restEvent?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    execute: (...args: any[]) => any;
}
