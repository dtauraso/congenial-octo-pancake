// In-place node id rename. Double-click the title text on a node to edit;
// Enter commits, Esc cancels. On commit, every reference to the old id is
// rewritten atomically: edges (source/target), timing steps (fires, state
// keys), and viewer state (saved views, folds, lastSelectionIds). The edge
// id strings and labels are intentionally left as-is — they're cosmetic
// keys, not refs.
//
// topogen uses node.id verbatim as the Go variable name, so renaming here
// shows up directly in the regenerated Go output.

import { spec, viewerState } from "./state";
import { render } from "./render";
import { scheduleSave } from "./save";

const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

let activeInput: HTMLInputElement | null = null;

export function beginRenameNodeId(oldId: string, anchorEl: SVGTextElement) {
  if (activeInput) return;
  const rect = anchorEl.getBoundingClientRect();
  const input = document.createElement("input");
  input.type = "text";
  input.className = "rename-input";
  input.value = oldId;
  input.style.position = "fixed";
  input.style.left = `${Math.round(rect.left - 4)}px`;
  input.style.top = `${Math.round(rect.top - 2)}px`;
  input.style.width = `${Math.max(60, Math.round(rect.width + 16))}px`;
  input.style.height = `${Math.round(rect.height + 4)}px`;
  document.body.appendChild(input);
  activeInput = input;
  input.select();
  input.focus();

  let done = false;
  const finish = (commit: boolean) => {
    if (done) return;
    done = true;
    const next = input.value.trim();
    input.remove();
    activeInput = null;
    if (commit && next && next !== oldId) {
      const err = renameNodeId(oldId, next);
      if (err) {
        // Re-open the editor with the rejected value so the user can fix it.
        // eslint-disable-next-line no-alert
        window.alert(`rename rejected: ${err}`);
        return;
      }
      render();
      scheduleSave();
    }
  };

  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") { ev.preventDefault(); finish(true); }
    else if (ev.key === "Escape") { ev.preventDefault(); finish(false); }
  });
  input.addEventListener("blur", () => finish(true));
}

function renameNodeId(oldId: string, newId: string): string | null {
  if (!IDENT_RE.test(newId)) {
    return `"${newId}" is not a valid Go identifier ([A-Za-z_][A-Za-z0-9_]*)`;
  }
  if (spec.nodes.some((n) => n.id === newId)) {
    return `node id "${newId}" already exists`;
  }
  const node = spec.nodes.find((n) => n.id === oldId);
  if (!node) return `node "${oldId}" not found`;

  node.id = newId;
  for (const e of spec.edges) {
    if (e.source === oldId) e.source = newId;
    if (e.target === oldId) e.target = newId;
  }
  if (spec.timing) {
    for (const s of spec.timing.steps) {
      if (s.fires) s.fires = s.fires.map((x) => (x === oldId ? newId : x));
      if (s.state && Object.prototype.hasOwnProperty.call(s.state, oldId)) {
        s.state[newId] = s.state[oldId];
        delete s.state[oldId];
      }
    }
  }
  if (viewerState.views) {
    for (const v of viewerState.views) {
      v.nodeIds = v.nodeIds.map((x) => (x === oldId ? newId : x));
    }
  }
  if (viewerState.folds) {
    for (const f of viewerState.folds) {
      f.memberIds = f.memberIds.map((x) => (x === oldId ? newId : x));
    }
  }
  if (viewerState.lastSelectionIds) {
    viewerState.lastSelectionIds = viewerState.lastSelectionIds.map(
      (x) => (x === oldId ? newId : x),
    );
  }
  return null;
}
