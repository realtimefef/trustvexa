import { nextState } from './state-machine.js';
export class InvalidTransitionError extends Error {
    from;
    event;
    constructor(from, event) {
        super(`Invalid escrow transition: state '${from}' does not accept event '${event}'`);
        this.name = 'InvalidTransitionError';
        this.from = from;
        this.event = event;
    }
}
export function planTransition(from, event, readVersion) {
    const to = nextState(from, event);
    if (to === null)
        throw new InvalidTransitionError(from, event);
    return { from, to, event, readVersion, nextVersion: readVersion + 1 };
}
//# sourceMappingURL=transition.js.map