// Single source of truth for in-place contenteditable editors on rendered
// node labels. rename.ts and sublabel.ts duplicated Range/Selection setup,
// keydown commit/cancel, blur commit, and the active-element guard; both
// now call `beginInlineEdit` with their commit policy.
//
// The trigger remains imperative (double-click handler in app.tsx hands us
// the existing label element to edit in place); we don't replace the label
// with a floating React input because rendering inside a react-flow node's
// inner DOM avoids a positioning round-trip and keeps the edited label
// visually identical to the rendered one.

import { mutateBoth, mutateSpec, getSpec, getViewerState } from "./state";
import { scheduleSave } from "./save";
import { applyRename } from "./rename-core";

type RerenderFn = () => void;

let active: HTMLElement | null = null;
let rerender: RerenderFn = () => {};
export function setInlineEditRerender(fn: RerenderFn) { rerender = fn; }

// Synchronously commit any in-progress inline edit. Run / save-flush
// callsites use this so a half-typed rename doesn't get left out of the
// posted spec. Returns true if an edit was active and committed.
export function flushActiveInlineEdit(): boolean {
  if (!active) return false;
  active.blur();
  return true;
}

interface Options {
  initial: string;             // text shown in the editor; written back on cancel
  activeClass: string;         // CSS class added during edit (visual cue)
  onCommit: (next: string) => string | null;
  // null = accepted; string = rejected with an error message. The element's
  // text content is restored to `initial` on rejection. The implementation
  // is responsible for actually applying the edit (mutateSpec / mutateBoth).
}

function beginInlineEdit(el: HTMLElement | null, opts: Options) {
  if (active || !el) return;
  active = el;
  el.classList.add(opts.activeClass, "nodrag", "nopan");
  el.contentEditable = "plaintext-only";
  el.spellcheck = false;
  el.textContent = opts.initial;

  // Select all text so typing replaces the existing label.
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  el.focus();

  let done = false;
  const finish = (commit: boolean) => {
    if (done) return;
    done = true;
    const next = (el.textContent ?? "").trim();
    el.contentEditable = "false";
    el.classList.remove(opts.activeClass, "nodrag", "nopan");
    active = null;
    if (commit) {
      const err = opts.onCommit(next);
      if (err !== null && err !== "") window.alert(err);
    }
    // Always rerender from spec so cancelled edits / rejected commits /
    // no-op commits all restore whatever decorated DOM the renderer would
    // produce (e.g. sublabel placeholder italics for an empty value).
    // Cheaper than getting the restoration right in-place.
    rerender();
  };

  el.addEventListener("keydown", (ev: KeyboardEvent) => {
    if (ev.key === "Enter") { ev.preventDefault(); finish(true); }
    else if (ev.key === "Escape") { ev.preventDefault(); finish(false); }
  });
  el.addEventListener("blur", () => finish(true), { once: true });
}

export function beginRenameNodeId(oldId: string, labelEl: HTMLElement | null) {
  beginInlineEdit(labelEl, {
    initial: oldId,
    activeClass: "rename-active",
    onCommit: (next) => {
      if (!next || next === oldId) return ""; // silent cancel — no alert
      // Validate against a throwaway clone so a rejected rename leaves both
      // surfaces (and both undo stacks) untouched.
      const probeErr = applyRename(
        structuredClone(getSpec()),
        structuredClone(getViewerState()),
        oldId,
        next,
      );
      if (probeErr) return `rename rejected: ${probeErr}`;
      mutateBoth((s, v) => { applyRename(s, v, oldId, next); });
      scheduleSave();
      return null;
    },
  });
}

export function beginEditSublabel(nodeId: string, el: HTMLElement | null) {
  const node = getSpec().nodes.find((n) => n.id === nodeId);
  if (!node) return;
  const original = node.sublabel ?? "";
  beginInlineEdit(el, {
    initial: original,
    activeClass: "sublabel-active",
    onCommit: (next) => {
      if (next === original) return "";
      mutateSpec((s) => {
        const target = s.nodes.find((n) => n.id === nodeId);
        if (!target) return;
        if (next === "") delete target.sublabel;
        else target.sublabel = next;
      });
      scheduleSave();
      return null;
    },
  });
}
