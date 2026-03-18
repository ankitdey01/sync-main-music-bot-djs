export class ShoukakuEvent {
    public data: ShoukakuEventOptions;
    constructor(options: ShoukakuEventOptions) {
        this.data = options;
    }
}

type ValidNodeEvents = 
    "ready" |
    "error" |
    "close" |
    "disconnect" |
    "debug";

type ValidPlayerEvents =
    "playerStart" |
    "playerEnd" |
    "playerEmpty" |
    "playerClosed" |
    "playerUpdate" |
    "playerException" |
    "playerStuck" |
    "playerResumed";

type ValidEvents = ValidNodeEvents | ValidPlayerEvents;

export interface ShoukakuEventOptions {
    name: ValidEvents | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    execute: (...args: any[]) => any;
}
