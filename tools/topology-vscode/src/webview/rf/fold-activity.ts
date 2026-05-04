// Pure helpers for fold-halo activity. Extracted from FoldNode so the
// state-machine and boundary-detection logic can be unit-tested without
// React or a runner. The hook wires runner events into these.

export type FoldActivityListener = (active: boolean) => void;

export type FoldActivityTracker = {
  noteFire(): void;
  isActive(): boolean;
  dispose(): void;
};

/**
 * Halo activity is on while members are firing and goes off after
 * `decayMs` of silence. Each `noteFire()` flips the state on (if not
 * already) and resets the decay timer; the timer firing flips it off.
 *
 * `setTimer` defaults to setTimeout/clearTimeout but is injectable so
 * tests can use fake timers without polluting global state.
 */
export function createFoldActivityTracker(
  decayMs: number,
  onChange: FoldActivityListener,
  setTimer: {
    set: (fn: () => void, ms: number) => unknown;
    clear: (h: unknown) => void;
  } = { set: setTimeout, clear: clearTimeout },
): FoldActivityTracker {
  let active = false;
  let timer: unknown = null;
  return {
    noteFire(): void {
      if (!active) {
        active = true;
        onChange(true);
      }
      if (timer !== null) setTimer.clear(timer);
      timer = setTimer.set(() => {
        timer = null;
        if (!active) return;
        active = false;
        onChange(false);
      }, decayMs);
    },
    isActive(): boolean {
      return active;
    },
    dispose(): void {
      if (timer !== null) {
        setTimer.clear(timer);
        timer = null;
      }
    },
  };
}

/**
 * True when an emit from `fromId` to `toId` crosses the fold boundary —
 * i.e. exactly one of the two endpoints is a member of the fold. Pure
 * member-to-member emissions and pure outside-to-outside emissions are
 * not boundary crossings.
 */
export function isFoldBoundaryEmit(
  members: ReadonlySet<string>,
  fromId: string,
  toId: string,
): boolean {
  return members.has(fromId) !== members.has(toId);
}
