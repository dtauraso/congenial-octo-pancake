import { useEffect } from "react";
import { specToFlow } from "../adapter";
import { setInlineEditRerender } from "../../inline-edit";
import { vscode } from "../../vscode-api";
import { getSpec, viewerState } from "../../state";
import { useStore } from "../../state/store";
import type { AppCtx } from "./_ctx";
import { handleLoad } from "./_handle-load";
import { handleViewLoad } from "./_handle-view-load";
import { installHostMessageRouter } from "./_install-host-message-router";

export function useHostMessages(ctx: AppCtx) {
  // Inline-edit rerender hook: state.ts mutators can't see RF's setNodes,
  // so we register a callback that rebuilds the flow from the live spec.
  useEffect(() => {
    const rerenderFromSpec = () => {
      const next = getSpec();
      ctx.lastSpec.current = next;
      const flow = specToFlow(next, viewerState.folds, viewerState, viewerState.lastSelectionIds ?? [], useStore.getState().dimmed);
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
        viewLoad: (text) => handleViewLoad(ctx, text),
      },
    );
  }, [ctx]);
}
