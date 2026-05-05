// Per-fold diff tally: when a fold is collapsed, its members are absent
// from the rendered flow, so add/remove/move signals inside the fold
// are otherwise invisible. Surface as counts on the fold's data so the
// collapsed placeholder can render a badge.

import type { Fold } from "../../viewerState";

export type FoldDiffCounts = { added: number; removed: number; moved: number };

export function computeFoldCounts(
  folds: Fold[],
  addedNodes: ReadonlySet<string>,
  removedNodes: ReadonlySet<string>,
  movedNodes: ReadonlySet<string>,
): Map<string, FoldDiffCounts> {
  const out = new Map<string, FoldDiffCounts>();
  for (const f of folds) {
    if (!f.collapsed) continue;
    let added = 0, removed = 0, moved = 0;
    for (const id of f.memberIds) {
      if (addedNodes.has(id)) added++;
      if (removedNodes.has(id)) removed++;
      if (movedNodes.has(id)) moved++;
    }
    if (added || removed || moved) out.set(f.id, { added, removed, moved });
  }
  return out;
}
