import { useHotkeys } from "react-hotkeys-hook";
import type { ReactFlowInstance } from "reactflow";
import { viewerState } from "../../state";

// f → fit-view all; shift+f → fit-view selection. Lowercase only —
// capital F (shift+F) is the selection variant.
export function useFitViewHotkeys(rf: ReactFlowInstance) {
  useHotkeys("f", (e) => {
    e.preventDefault();
    rf.fitView({ padding: 0.2, duration: 250 });
  }, { enableOnContentEditable: false }, [rf]);

  useHotkeys("shift+f", (e) => {
    e.preventDefault();
    const selIds = viewerState.lastSelectionIds ?? [];
    if (selIds.length > 0) {
      const set = new Set(selIds);
      const sel = rf.getNodes().filter((n) => set.has(n.id));
      if (sel.length > 0) {
        rf.fitView({ nodes: sel, padding: 0.4, duration: 250, maxZoom: 1.2 });
        return;
      }
    }
    rf.fitView({ padding: 0.2, duration: 250 });
  }, { enableOnContentEditable: false }, [rf]);
}
