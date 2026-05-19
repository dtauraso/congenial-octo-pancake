// Returns the subset of savedIds that are still present in presentIds.
// An empty result means no prior selection survives (clear ghost selections).
export function reconcileSelection(
  savedIds: string[] | undefined,
  presentIds: Iterable<string>,
): string[] {
  const present = new Set(presentIds);
  return (savedIds ?? []).filter((id) => present.has(id));
}
