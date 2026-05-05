import type { Connection, Edge as RFEdge } from "reactflow";
import { NODE_TYPES, type EdgeKind } from "../../../schema";
import { specToFlow } from "../adapter";
import { scheduleSave } from "../../save";
import { mutateSpec, spec, viewerState } from "../../state";
import type { AppCtx } from "./_ctx";

export function onReconnectImpl(ctx: AppCtx, oldEdge: RFEdge, conn: Connection) {
  if (ctx.isReadOnlyView()) return;
  if (!conn.source || !conn.target || !conn.sourceHandle || !conn.targetHandle) return;
  if (!ctx.lastSpec.current) return;
  const specEdge = spec.edges.find((e) => e.id === oldEdge.id);
  if (!specEdge) return;
  const srcNode = spec.nodes.find((n) => n.id === conn.source);
  const dstNode = spec.nodes.find((n) => n.id === conn.target);
  if (!srcNode || !dstNode) return;
  const srcDef = NODE_TYPES[srcNode.type];
  const dstDef = NODE_TYPES[dstNode.type];
  const srcPort = srcDef?.outputs.find((p) => p.name === conn.sourceHandle);
  const dstPort = dstDef?.inputs.find((p) => p.name === conn.targetHandle);
  if (!srcPort || !dstPort) return;
  const newKind: EdgeKind = srcPort.kind === dstPort.kind ? srcPort.kind : "any";
  const next = mutateSpec((s) => {
    const e = s.edges.find((x) => x.id === oldEdge.id);
    if (!e) return;
    e.source = conn.source!;
    e.sourceHandle = conn.sourceHandle!;
    e.target = conn.target!;
    e.targetHandle = conn.targetHandle!;
    e.kind = newKind;
  });
  ctx.reconnectOk.current = true;
  ctx.lastSpec.current = next;
  const flow = specToFlow(next, viewerState.folds, viewerState);
  ctx.setNodes(flow.nodes);
  ctx.setEdges(flow.edges);
  scheduleSave();
}
