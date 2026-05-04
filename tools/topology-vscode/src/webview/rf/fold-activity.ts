// Fold-halo activity helpers.
//
// Halo semantics: the fold is a black box; halo on means "stuff is
// inside, not yet released." Each `emit` event that crosses the fold's
// boundary in/out increments/decrements an accumulator. Halo on iff
// the accumulator is > 0. Internal and external emits are no-ops.

/**
 * True when an emit from `fromId` to `toId` crosses the fold boundary —
 * i.e. exactly one of the two endpoints is a member of the fold.
 */
export function isFoldBoundaryEmit(
  members: ReadonlySet<string>,
  fromId: string,
  toId: string,
): boolean {
  return members.has(fromId) !== members.has(toId);
}

/**
 * Apply one emit to the accumulator. Returns the new count, clamped at
 * 0 so a fold that emits before it ever receives (initial held values
 * etc.) doesn't go negative. Returns `count` unchanged for non-boundary
 * emits.
 */
export function applyFoldBoundaryEmit(
  members: ReadonlySet<string>,
  count: number,
  fromId: string,
  toId: string,
): number {
  if (!isFoldBoundaryEmit(members, fromId, toId)) return count;
  const inward = members.has(toId);
  return Math.max(0, count + (inward ? 1 : -1));
}
