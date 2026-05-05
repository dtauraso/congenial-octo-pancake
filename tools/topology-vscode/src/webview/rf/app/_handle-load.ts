import { parseSpec, type Spec } from "../../../schema";
import { load as loadRunner, play as playRunner, reset as resetRunner } from "../../../sim/runner";
import { specToFlow } from "../adapter";
import { clearSpecHistory, patchViewerState, setSpec, viewerState } from "../../state";
import type { AppCtx } from "./_ctx";

// Fresh "load" message: parse, install spec, kick the runner, then
// reconcile any persisted selection against the new node set so stale
// ids from a prior session don't leak through as ghost selections.
export function handleLoad(ctx: AppCtx, text: string) {
  try {
    const next: Spec = parseSpec(JSON.parse(text));
    setSpec(next);
    // Fresh load drops history — undoing into a previous file's spec
    // would be incoherent (ids may not even exist there).
    clearSpecHistory();
    ctx.lastSpec.current = next;
    loadRunner(next);
    resetRunner();
    // Defer auto-play one frame so AnimatedEdge subscribers and React
    // Flow's first layout pass exist when the runner's initial stepOnce
    // fires. Without this, the first emit dispatches into an empty
    // subscriber set and the geom effect re-runs as RF settles,
    // producing a startup anim-rerun storm.
    requestAnimationFrame(() => playRunner());
    const flow = specToFlow(next, viewerState.folds);
    const presentIds = new Set(flow.nodes.map((n) => n.id));
    const filtered = (viewerState.lastSelectionIds ?? []).filter((id) => presentIds.has(id));
    const sel = new Set(filtered);
    if (sel.size > 0) {
      flow.nodes = flow.nodes.map((n) => sel.has(n.id) ? { ...n, selected: true } : n);
    }
    patchViewerState((v) => { v.lastSelectionIds = filtered.length > 0 ? filtered : undefined; });
    ctx.setNodes(flow.nodes);
    ctx.setEdges(flow.edges);
  } catch (err) {
    console.error("invalid topology.json", err);
  }
}
