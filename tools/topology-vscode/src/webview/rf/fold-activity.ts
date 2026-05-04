// Halo predicate + boundary helper. Halo means "data is in the fold,"
// expressed as: the simulator queue contains at least one pending event
// whose receiver is a fold member. That's "forward-looking" activity —
// off when there's nothing coming for any member, on while pulses are
// in flight toward members. Pause/resume falls out for free: the queue
// can't change while paused, so the predicate freezes.
//
// This deliberately ignores `world.state` (which holds `__has_<port>`
// only on join nodes — too narrow — and `held` forever on inhibitors —
// too broad).

import type { SimEvent, World } from "../../sim/simulator";

export function foldHasPendingEvents(
  memberIds: readonly string[],
  world: World | null | undefined,
): boolean {
  if (!world) return false;
  const members = memberIds.length < 8 ? null : new Set(memberIds);
  for (const ev of world.queue) {
    if (members ? members.has(ev.toNodeId) : memberIds.includes(ev.toNodeId)) return true;
  }
  return false;
}

/**
 * Like {@link foldHasPendingEvents} but returns the receiver id of the
 * first pending event targeting a member (or null). Used by the probe
 * to name the member responsible for an off→on transition.
 */
export function firstPendingMember(
  memberIds: readonly string[],
  world: World | null | undefined,
): string | null {
  if (!world) return null;
  const members = memberIds.length < 8 ? null : new Set(memberIds);
  for (const ev of world.queue) {
    if (members ? members.has(ev.toNodeId) : memberIds.includes(ev.toNodeId)) return ev.toNodeId;
  }
  return null;
}

// Re-export for any caller still importing this name; not used by the
// new halo path but kept so other surfaces (boundary-emit detection)
// don't break on the rewrite.
export { type SimEvent };

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
