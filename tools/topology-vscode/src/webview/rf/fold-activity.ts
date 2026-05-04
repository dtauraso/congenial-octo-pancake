/**
 * True when an emit from `fromId` to `toId` crosses the fold boundary —
 * exactly one of the two endpoints is a member. Internal (member →
 * member) and external (outside → outside) emits return false.
 */
export function isFoldBoundaryEmit(
  members: ReadonlySet<string>,
  fromId: string,
  toId: string,
): boolean {
  return members.has(fromId) !== members.has(toId);
}
