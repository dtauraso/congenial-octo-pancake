import { useCallback, useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type { Spec } from "../../../schema";
import { specToFlow } from "../adapter";
import { scheduleSave, scheduleViewSave } from "../../save";
import {
  getLastScope, redoSpec, redoViewer, setLastScope, undoSpec, undoViewer, viewerState,
} from "../../state";
import type { AppCtx } from "./_ctx";

export function useUndoRedo(ctx: AppCtx, hotkeysEnabled: boolean) {
  const { setNodes, setEdges, lastSpec, flashIdsRef, flashTimerRef } = ctx;

  // Brief diff-added flash on items that re-appear after an undo/redo.
  // We tag re-appearing items only — items removed by the undo no longer
  // render, so there's nothing to decorate without a ghost-rendering pass.
  const rebuildWithFlash = useCallback((flashSet: Set<string>) => {
    if (!lastSpec.current) return;
    const flow = specToFlow(lastSpec.current, viewerState.folds, viewerState);
    if (flashSet.size > 0) {
      const tag = (cn: string | undefined) => [cn, "diff-added"].filter(Boolean).join(" ");
      flow.nodes = flow.nodes.map((n) => flashSet.has(n.id) ? { ...n, className: tag(n.className) } : n);
      flow.edges = flow.edges.map((e) => flashSet.has(e.id) ? { ...e, className: tag(e.className) } : e);
      flashIdsRef.current = flashSet;
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = window.setTimeout(() => {
        flashIdsRef.current = new Set();
        flashTimerRef.current = null;
        if (lastSpec.current) {
          const f = specToFlow(lastSpec.current, viewerState.folds, viewerState);
          setNodes(f.nodes);
          setEdges(f.edges);
        }
      }, 1500);
    }
    setNodes(flow.nodes);
    setEdges(flow.edges);
  }, [lastSpec, flashIdsRef, flashTimerRef, setNodes, setEdges]);

  const undoRedo = useCallback((isUndo: boolean) => {
    const idsOf = (s: Spec | null): Set<string> => {
      const out = new Set<string>();
      if (!s) return out;
      for (const n of s.nodes) out.add(n.id);
      for (const e of s.edges) out.add(e.id);
      return out;
    };
    if (getLastScope() === "viewer") {
      const beforeFolds = new Set((viewerState.folds ?? []).map((f) => f.id));
      const next = isUndo ? undoViewer() : redoViewer();
      if (!next) return;
      const afterFolds = new Set((next.folds ?? []).map((f) => f.id));
      const reappeared = new Set<string>();
      for (const id of afterFolds) if (!beforeFolds.has(id)) reappeared.add(id);
      rebuildWithFlash(reappeared);
      scheduleViewSave();
    } else {
      const before = idsOf(lastSpec.current);
      const next = isUndo ? undoSpec() : redoSpec();
      if (!next) return;
      lastSpec.current = next;
      const after = idsOf(next);
      const reappeared = new Set<string>();
      for (const id of after) if (!before.has(id)) reappeared.add(id);
      rebuildWithFlash(reappeared);
      scheduleSave();
    }
  }, [rebuildWithFlash, lastSpec]);

  // mousedown listener tags whichever surface the user last interacted
  // with so undo routes to the matching scoped stack.
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      const scoped = t?.closest?.<HTMLElement>("[data-undo-scope]");
      setLastScope((scoped?.dataset.undoScope as "spec" | "viewer") ?? "spec");
    };
    window.addEventListener("mousedown", onMouseDown, true);
    return () => {
      window.removeEventListener("mousedown", onMouseDown, true);
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
    };
  }, [flashTimerRef]);

  useHotkeys("mod+z", (e) => { e.preventDefault(); undoRedo(true); },
    { enabled: hotkeysEnabled, enableOnContentEditable: false });
  useHotkeys("mod+shift+z, mod+y", (e) => { e.preventDefault(); undoRedo(false); },
    { enabled: hotkeysEnabled, enableOnContentEditable: false });
}
