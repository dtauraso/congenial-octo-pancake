// Bookmark add/delete: mutate the viewer state, sort by cycle, and
// schedule a view-side save.

import { mutateViewer } from "../../state";
import { scheduleViewSave } from "../../save";
import type { Bookmark } from "../../viewerState";

export function addBookmark(
  name: string,
  startNodeId: string,
  cycle: number,
): void {
  const next: Bookmark = { name, startNodeId, cycle };
  mutateViewer((s) => {
    const list = s.bookmarks ?? [];
    const idx = list.findIndex((b) => b.name === name);
    if (idx >= 0) list[idx] = next;
    else list.push(next);
    list.sort((a, b) => a.cycle - b.cycle);
    s.bookmarks = list;
  });
  scheduleViewSave();
}

export function deleteBookmark(name: string): void {
  mutateViewer((s) => {
    s.bookmarks = (s.bookmarks ?? []).filter((b) => b.name !== name);
  });
  scheduleViewSave();
}
