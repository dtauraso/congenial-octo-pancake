import { parseSpec, type Spec } from "../../../schema";
import { load as loadRunner, play as playRunner, reset as resetRunner } from "../../../sim/runner";
import { matchSubstrate } from "../../../substrate/match";
import { loadSubstrate, stopSubstrate } from "../../../substrate/runtime";
import { slog } from "../../../substrate/log";
import { specToFlow } from "../adapter";
import { clearSpecHistory, patchViewerState, setSpec, viewerState } from "../../state";
import { scheduleViewSave } from "../../save";
import { migrateLegacyFields } from "./_migrate-legacy-fields";
import type { AppCtx } from "./_ctx";

// Dedupe identical "load" messages. React StrictMode (dev) and the
// host's send-on-ready path can each fire load with the same text;
// without this guard the substrate runs through stop+start twice, the
// queue resets and emits two leading "0" pulses ("00 combination").
let lastLoadedText: string | null = null;

// Fresh "load" message: parse, install spec, kick the runner, then
// reconcile any persisted selection against the new node set so stale
// ids from a prior session don't leak through as ghost selections.
export function handleLoad(ctx: AppCtx, text: string) {
  if (text === lastLoadedText) return;
  lastLoadedText = text;
  try {
    const rawJson = JSON.parse(text);
    // One-shot migration: extract x/y/sublabel/state/route from legacy spec
    // fields and seed viewerState before parseSpec drops them.
    let migrated = false;
    patchViewerState((v) => {
      const nodesBefore = JSON.stringify(v.nodes);
      const edgesBefore = JSON.stringify(v.edges);
      migrateLegacyFields(rawJson, v);
      if (JSON.stringify(v.nodes) !== nodesBefore || JSON.stringify(v.edges) !== edgesBefore) {
        migrated = true;
      }
    });
    if (migrated) scheduleViewSave();
    const next: Spec = parseSpec(rawJson);
    setSpec(next);
    // Fresh load drops history — undoing into a previous file's spec
    // would be incoherent (ids may not even exist there).
    clearSpecHistory();
    ctx.lastSpec.current = next;
    if (matchSubstrate(next)) {
      slog("match", { nodes: next.nodes.length, edges: next.edges.length });
      // Substrate path. Run synchronously BEFORE setNodes/setEdges so
      // the substrate's emit-bus subscription is registered before
      // AnimatedEdge mounts and fires its `edge-ready` signal — that
      // signal is what unblocks the first emit in the ack-driven loop,
      // and dropping it stalls the substrate forever.
      loadSubstrate(next);
    } else {
      slog("no-match", { types: next.nodes.map((n) => n.type), kinds: next.edges.map((e) => e.kind) });
      // Legacy path. Stop the substrate in case the previous topology
      // was running on it.
      stopSubstrate();
      loadRunner(next);
      resetRunner();
      // Defer auto-play one frame so AnimatedEdge subscribers and React
      // Flow's first layout pass exist when the runner's initial stepOnce
      // fires. Without this, the first emit dispatches into an empty
      // subscriber set and the geom effect re-runs as RF settles,
      // producing a startup anim-rerun storm.
      requestAnimationFrame(() => playRunner());
    }
    const flow = specToFlow(next, viewerState.folds, viewerState);
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
    // Reset cache on parse error so a corrected payload still loads.
    lastLoadedText = null;
    console.error("invalid topology.json", err);
  }
}
