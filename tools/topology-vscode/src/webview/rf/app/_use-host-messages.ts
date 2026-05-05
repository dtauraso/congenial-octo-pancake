import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { parseSpec, type Spec } from "../../../schema";
import { specToFlow } from "../adapter";
import { setInlineEditRerender } from "../../inline-edit";
import { vscode } from "../../save";
import { getSpec, viewerState } from "../../state";
import type { CompareMode } from "../CompareToolbar";
import type { AppCtx } from "./_ctx";
import { handleLoad } from "./_handle-load";
import { handleViewLoad } from "./_handle-view-load";
import { installHostMessageRouter } from "./_install-host-message-router";

type CompareSetters = {
  setComparisonSpec: Dispatch<SetStateAction<Spec | null>>;
  setComparisonLabel: Dispatch<SetStateAction<string | null>>;
  setCompareMode: Dispatch<SetStateAction<CompareMode>>;
  setCompareError: Dispatch<SetStateAction<string | null>>;
};

export function useHostMessages(ctx: AppCtx, c: CompareSetters) {
  // Inline-edit rerender hook: state.ts mutators can't see RF's setNodes,
  // so we register a callback that rebuilds the flow from the live spec.
  useEffect(() => {
    const rerenderFromSpec = () => {
      // Source from the zustand store, not ctx.lastSpec.current — local
      // mutations (rename via mutateBoth) replace store.spec via immer
      // but don't touch lastSpec.current, so the latter is stale right
      // after a rename. Keep lastSpec.current in sync too so other
      // consumers (on-connect, edge-handlers) see the new ids.
      const next = getSpec();
      ctx.lastSpec.current = next;
      const flow = specToFlow(next, viewerState.folds, viewerState);
      ctx.setNodes(flow.nodes);
      ctx.setEdges(flow.edges);
    };
    setInlineEditRerender(rerenderFromSpec);
  }, [ctx]);

  useEffect(() => {
    return installHostMessageRouter(
      {
        addEventListener: (t, h) => window.addEventListener(t, h as EventListener),
        removeEventListener: (t, h) => window.removeEventListener(t, h as EventListener),
        postMessage: (m) => vscode.postMessage(m),
      },
      {
        load: (text) => handleLoad(ctx, text),
        compareLoad: ({ text, label }) => {
          try {
            const next: Spec = parseSpec(JSON.parse(text));
            c.setComparisonSpec(next);
            c.setComparisonLabel(label);
            c.setCompareError(null);
            c.setCompareMode("A-live");
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            c.setCompareError(`could not parse ${label}: ${message}`);
          }
        },
        compareError: (message) => c.setCompareError(message),
        viewLoad: (text) => handleViewLoad(ctx, text),
      },
    );
  }, [ctx, c]);
}
