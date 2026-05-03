// In-place node id rename, adapted for React Flow. Double-click a node →
// the label itself becomes contenteditable; Enter commits, Esc cancels.
// On commit, every reference to the old id is rewritten atomically: edges
// (source/target), timing steps (fires, state keys), and viewer state
// (saved views, folds, lastSelectionIds). topogen uses node.id verbatim
// as the Go variable name, so a rename here shows up directly in the
// regenerated Go output.

import { setSpec, spec, viewerState } from "./state";
import { scheduleSave } from "./save";
import { applyRename } from "./rename-core";

let activeLabel: HTMLElement | null = null;
type RerenderFn = () => void;
let rerender: RerenderFn = () => {};

export function setRenameRerender(fn: RerenderFn) { rerender = fn; }

export function beginRenameNodeId(oldId: string, labelEl: HTMLElement | null) {
  if (activeLabel || !labelEl) return;
  activeLabel = labelEl;
  labelEl.classList.add("rename-active", "nodrag", "nopan");
  labelEl.contentEditable = "plaintext-only";
  labelEl.spellcheck = false;

  // Select all the text inside the label.
  const range = document.createRange();
  range.selectNodeContents(labelEl);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  labelEl.focus();

  let done = false;
  const finish = (commit: boolean) => {
    if (done) return;
    done = true;
    const next = (labelEl.textContent ?? "").trim();
    labelEl.contentEditable = "false";
    labelEl.classList.remove("rename-active", "nodrag", "nopan");
    activeLabel = null;
    if (commit && next && next !== oldId) {
      // Run on a clone so a rejected rename leaves the live spec reference
      // untouched (no churn on rejection, no half-applied mutations).
      const clone = structuredClone(spec);
      const err = applyRename(clone, viewerState, oldId, next);
      if (err) {
        window.alert(`rename rejected: ${err}`);
        labelEl.textContent = oldId;
        return;
      }
      setSpec(clone);
      rerender();
      scheduleSave();
    } else {
      labelEl.textContent = oldId;
    }
  };

  labelEl.addEventListener("keydown", (ev: KeyboardEvent) => {
    if (ev.key === "Enter") { ev.preventDefault(); finish(true); }
    else if (ev.key === "Escape") { ev.preventDefault(); finish(false); }
  });
  labelEl.addEventListener("blur", () => finish(true), { once: true });
}
