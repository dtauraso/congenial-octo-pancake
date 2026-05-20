import type { Connection, Edge as RFEdge } from "reactflow";
import { KIND_COLORS, NODE_TYPES, type EdgeKind } from "../../../schema";
import { scheduleSave } from "../../save";
import { mutateSpec, spec } from "../../state";
import { pushSnapshot } from "../history";
import { rfSetEdges } from "../rf-imperative";
import type { AppCtx } from "./_ctx";

export function onReconnectImpl(ctx: AppCtx, oldEdge: RFEdge, conn: Connection) {
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
  pushSnapshot();
  mutateSpec((s) => {
    const e = s.edges.find((x) => x.id === oldEdge.id);
    if (!e) return;
    e.source = conn.source!;
    e.sourceHandle = conn.sourceHandle!;
    e.target = conn.target!;
    e.targetHandle = conn.targetHandle!;
    e.kind = newKind;
  });
  ctx.reconnectOk.current = true;
  rfSetEdges((es) => es.map((e) =>
    e.id !== oldEdge.id ? e : {
      ...e,
      source: conn.source!,
      sourceHandle: conn.sourceHandle!,
      target: conn.target!,
      targetHandle: conn.targetHandle!,
      style: { ...e.style, stroke: KIND_COLORS[newKind] ?? "#888" },
      data: {
        ...e.data,
        kind: newKind,
        sourceHandle: conn.sourceHandle!,
        targetHandle: conn.targetHandle!,
      },
    }
  ));
  scheduleSave();
}
