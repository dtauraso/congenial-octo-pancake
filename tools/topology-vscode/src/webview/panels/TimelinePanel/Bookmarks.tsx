// Bookmark marker list + naming-mode input + add button.

import { useState } from "react";
import { jumpTo, getWorld, pause } from "../../../sim/runner";
import type { Bookmark } from "../../viewerState";
import { addBookmark, deleteBookmark } from "./bookmarks-store";

type Props = {
  bookmarks: Bookmark[];
  selectionIds: string[] | undefined;
};

export function Bookmarks({ bookmarks, selectionIds }: Props) {
  const [namingMode, setNamingMode] = useState(false);
  const [draftName, setDraftName] = useState("");

  const finishInput = (commit: boolean) => {
    setNamingMode(false);
    const name = draftName.trim();
    setDraftName("");
    if (!commit || !name) return;
    const w = getWorld();
    if (!w) return;
    const sel = (selectionIds ?? [])[0];
    const lastFired = w.history.length > 0 ? w.history[w.history.length - 1].nodeId : "";
    const startNodeId = sel ?? lastFired;
    if (!startNodeId) return;
    addBookmark(name, startNodeId, w.cycle);
  };

  const onAdd = () => {
    if (!getWorld()) return;
    pause();
    setDraftName("");
    setNamingMode(true);
  };

  return (
    <>
      <div className="timeline-markers">
        {bookmarks.map((b) => (
          <button
            key={b.name}
            type="button"
            className="timeline-marker"
            title={`${b.name} → cycle ${b.cycle} on ${b.startNodeId} (Delete to remove)`}
            onClick={(ev) => {
              ev.stopPropagation();
              jumpTo(b.cycle, b.startNodeId);
              (ev.currentTarget as HTMLElement).focus();
            }}
            onKeyDown={(ev) => {
              if (ev.key === "Delete" || ev.key === "Backspace") {
                ev.preventDefault();
                deleteBookmark(b.name);
              }
            }}
          >
            {`${b.name} ⤴`}
          </button>
        ))}
      </div>
      {namingMode ? (
        <input
          autoFocus
          type="text"
          placeholder="bookmark name…"
          className="timeline-name-input"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") finishInput(true);
            else if (e.key === "Escape") finishInput(false);
          }}
          onBlur={() => finishInput(true)}
        />
      ) : (
        <button
          type="button"
          className="timeline-add"
          title="save current cycle as a bookmark on the focused node"
          onClick={onAdd}
        >
          + bookmark
        </button>
      )}
    </>
  );
}
