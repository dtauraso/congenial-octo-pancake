import { useHotkeys } from "react-hotkeys-hook";
import type { ReactFlowInstance } from "reactflow";
import { viewerState } from "../viewer-state";
import { FIT_VIEW_DURATION_MS, FIT_VIEW_MAX_ZOOM, FIT_VIEW_PADDING, FIT_VIEW_PADDING_WIDE } from "./_constants";

// f → fit-view all; shift+f → fit-view selection. Lowercase only —
// capital F (shift+F) is the selection variant.
export function useFitViewHotkeys(rf: ReactFlowInstance) {
  useHotkeys("f", (e) => {
    e.preventDefault();
    rf.fitView({ padding: FIT_VIEW_PADDING, duration: FIT_VIEW_DURATION_MS });
  }, { enableOnContentEditable: false }, [rf]);

  useHotkeys("shift+f", (e) => {
    e.preventDefault();
    const selIds = viewerState.lastSelectionIds ?? [];
    if (selIds.length > 0) {
      const set = new Set(selIds);
      const sel = rf.getNodes().filter((n) => set.has(n.id));
      if (sel.length > 0) {
        rf.fitView({ nodes: sel, padding: FIT_VIEW_PADDING_WIDE, duration: FIT_VIEW_DURATION_MS, maxZoom: FIT_VIEW_MAX_ZOOM });
        return;
      }
    }
    rf.fitView({ padding: FIT_VIEW_PADDING, duration: FIT_VIEW_DURATION_MS });
  }, { enableOnContentEditable: false }, [rf]);
}
