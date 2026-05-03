// In-place editing of node.sublabel. Mirrors rename.ts: double-click the
// sublabel area on a rendered node, the element becomes contenteditable,
// Enter commits, Esc cancels. Sublabel is free text (presentation only —
// topogen ignores it), so no IDENT_RE check; trim and treat empty as
// "remove the field" so the spec stays clean.

import { mutateSpec, spec } from "./state";
import { scheduleSave } from "./save";

let activeEl: HTMLElement | null = null;
type RerenderFn = () => void;
let rerender: RerenderFn = () => {};

export function setSublabelRerender(fn: RerenderFn) { rerender = fn; }

export function beginEditSublabel(nodeId: string, el: HTMLElement | null) {
  if (activeEl || !el) return;
  const node = spec.nodes.find((n) => n.id === nodeId);
  if (!node) return;
  const original = node.sublabel ?? "";
  activeEl = el;
  el.classList.add("sublabel-active", "nodrag", "nopan");
  el.contentEditable = "plaintext-only";
  el.spellcheck = false;
  el.textContent = original;

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
    el.classList.remove("sublabel-active", "nodrag", "nopan");
    activeEl = null;
    if (commit && next !== original) {
      mutateSpec((s) => {
        const target = s.nodes.find((n) => n.id === nodeId);
        if (!target) return;
        if (next === "") delete target.sublabel;
        else target.sublabel = next;
      });
      rerender();
      scheduleSave();
    } else {
      rerender();
    }
  };

  el.addEventListener("keydown", (ev: KeyboardEvent) => {
    if (ev.key === "Enter") { ev.preventDefault(); finish(true); }
    else if (ev.key === "Escape") { ev.preventDefault(); finish(false); }
  });
  el.addEventListener("blur", () => finish(true), { once: true });
}
