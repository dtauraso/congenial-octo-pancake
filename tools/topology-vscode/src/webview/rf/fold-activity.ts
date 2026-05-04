// Pure helpers for fold-halo activity. Extracted from FoldNode so the
// state-machine and boundary-detection logic can be unit-tested without
// React or a runner. The hook wires runner events into these.

export type FoldActivityListener = (active: boolean) => void;

export type FoldActivityTracker = {
  // Member fired at sim time `now`. Activates the halo (idempotent) and
  // refreshes the decay deadline.
  noteFire(now: number): void;
  // Drives decay. The hook calls this on every runner event/state tick
  // with the current sim time. When `now - lastFire > decayMs` the halo
  // turns off. Pause/resume falls out for free: sim time stops
  // advancing while paused, so `tick` is a no-op until play resumes.
  tick(now: number): void;
  isActive(): boolean;
  dispose(): void;
};

export function createFoldActivityTracker(
  decayMs: number,
  onChange: FoldActivityListener,
): FoldActivityTracker {
  let active = false;
  let lastFire = 0;
  return {
    noteFire(now: number): void {
      lastFire = now;
      if (!active) {
        active = true;
        onChange(true);
      }
    },
    tick(now: number): void {
      if (!active) return;
      if (now - lastFire > decayMs) {
        active = false;
        onChange(false);
      }
    },
    isActive(): boolean {
      return active;
    },
    dispose(): void {
      active = false;
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
