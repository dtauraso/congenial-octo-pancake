import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { parseSpec, type Spec } from "../../../schema";
import { parseHostToWebview } from "../../../messages";
import { specToFlow } from "../adapter";
import { setInlineEditRerender } from "../../inline-edit";
import { vscode } from "../../save";
import { viewerState } from "../../state";
import type { CompareMode } from "../CompareToolbar";
import type { AppCtx } from "./_ctx";
import { handleLoad } from "./_handle-load";
import { handleViewLoad } from "./_handle-view-load";

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
      if (!ctx.lastSpec.current) return;
      const flow = specToFlow(ctx.lastSpec.current, viewerState.folds);
      ctx.setNodes(flow.nodes);
      ctx.setEdges(flow.edges);
    };
    setInlineEditRerender(rerenderFromSpec);
  }, [ctx]);

  useEffect(() => {
    const handler = (e: MessageEvent<unknown>) => {
      const msg = parseHostToWebview(e.data);
      if (!msg) return;
      if (msg.type === "load") {
        handleLoad(ctx, msg.text);
      } else if (msg.type === "compare-load") {
        try {
          const next: Spec = parseSpec(JSON.parse(msg.text));
          c.setComparisonSpec(next);
          c.setComparisonLabel(msg.label);
          c.setCompareError(null);
          c.setCompareMode("A-live");
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          c.setCompareError(`could not parse ${msg.label}: ${message}`);
        }
      } else if (msg.type === "compare-error") {
        c.setCompareError(msg.message);
      } else if (msg.type === "view-load") {
        handleViewLoad(ctx, msg.text);
      }
    };
    window.addEventListener("message", handler);
    vscode.postMessage({ type: "ready" });
    return () => window.removeEventListener("message", handler);
  }, [ctx, c]);
}
