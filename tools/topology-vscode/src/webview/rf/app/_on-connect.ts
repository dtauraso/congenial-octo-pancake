import type { Connection } from "reactflow";
import { NODE_TYPES, type EdgeKind } from "../../../schema";
import { specToFlow } from "../adapter";
import { scheduleSave } from "../../save";
import { mutateSpec, spec, viewerState } from "../../state";
import type { AppCtx } from "./_ctx";

export function onConnectImpl(ctx: AppCtx, conn: Connection) {
  if (ctx.isReadOnlyView()) return;
  if (!conn.source || !conn.target || !conn.sourceHandle || !conn.targetHandle) return;
  if (!ctx.lastSpec.current) return;
  const srcNode = spec.nodes.find((n) => n.id === conn.source);
  const dstNode = spec.nodes.find((n) => n.id === conn.target);
  if (!srcNode || !dstNode) return;
  const srcDef = NODE_TYPES[srcNode.type];
  const dstDef = NODE_TYPES[dstNode.type];
  const srcPort = srcDef?.outputs.find((p) => p.name === conn.sourceHandle);
  const dstPort = dstDef?.inputs.find((p) => p.name === conn.targetHandle);
  if (!srcPort || !dstPort) return;
  // Channel-type inference: edge kind is the source port's kind. Mismatch
  // falls back to "any" so validatePorts won't reject the new edge on
  // reload (kind is informational; handles carry the actual port identity).
  const kind: EdgeKind = srcPort.kind === dstPort.kind ? srcPort.kind : "any";
  const baseId = `${conn.source}.${conn.sourceHandle}->${conn.target}.${conn.targetHandle}`;
  let id = baseId;
  let n = 2;
  while (spec.edges.some((e) => e.id === id)) id = `${baseId}#${n++}`;
  // topogen uses edge.label verbatim as the channel variable name and
  // requires a valid Go identifier. Synthesize one; users can rename.
  const cap = (s: string) => (s.length === 0 ? s : s[0].toUpperCase() + s.slice(1));
  const baseLabel = `${conn.source}${cap(conn.sourceHandle)}To${cap(conn.target)}${cap(conn.targetHandle)}`
    .replace(/[^A-Za-z0-9_]/g, "_")
    .replace(/^([0-9])/, "_$1");
  let label = baseLabel;
  let m = 2;
  while (spec.edges.some((e) => e.label === label)) label = `${baseLabel}_${m++}`;
  const next = mutateSpec((s) => {
    s.edges.push({
      id,
      source: conn.source!,
      sourceHandle: conn.sourceHandle!,
      target: conn.target!,
      targetHandle: conn.targetHandle!,
      kind,
      label,
    });
  });
  ctx.lastSpec.current = next;
  const flow = specToFlow(next, viewerState.folds);
  ctx.setNodes(flow.nodes);
  ctx.setEdges(flow.edges);
  scheduleSave();
}
