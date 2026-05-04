// Pure mutations on viewerState.folds. No DOM imports — kept testable
// without a webview harness, mirroring rename-core / delete-core.
//
// Folds are viewer-only: topogen ignores topology.view.json, so creating
// or toggling a fold never changes the spec. The flat Wiring/ package the
// generator emits is byte-identical before and after a fold operation.

import type { Fold, ViewerState } from "./viewerState";

export function nextFoldId(viewerState: ViewerState): string {
  const taken = new Set((viewerState.folds ?? []).map((f) => f.id));
  let n = 0;
  while (taken.has(`fold${n}`)) n += 1;
  return `fold${n}`;
}

export function createFold(
  viewerState: ViewerState,
  memberIds: string[],
  position: [number, number],
  label?: string,
): string | undefined {
  if (memberIds.length < 2) return undefined;
  // Members must be unique and not already inside another fold (nested folds
  // are out of scope for this slice).
  const existingMembers = new Set<string>();
  for (const f of viewerState.folds ?? []) {
    for (const m of f.memberIds) existingMembers.add(m);
  }
  const unique = Array.from(new Set(memberIds)).filter((id) => !existingMembers.has(id));
  if (unique.length < 2) return undefined;
  const id = nextFoldId(viewerState);
  const fold: Fold = {
    id,
    label: label ?? id,
    memberIds: unique,
    position,
    collapsed: true,
  };
  viewerState.folds = [...(viewerState.folds ?? []), fold];
  return id;
}

export function toggleFold(viewerState: ViewerState, foldId: string): boolean {
  const folds = viewerState.folds;
  if (!folds) return false;
  const f = folds.find((x) => x.id === foldId);
  if (!f) return false;
  f.collapsed = !f.collapsed;
  return true;
}
