import type { Connection, Edge as RFEdge } from "reactflow";
import { KIND_COLORS, NODE_TYPES, type EdgeKind } from "../../../schema";
import { scheduleSave } from "../../save";
import { rfGetNodes, rfGetEdges, rfSetEdges } from "../rf-imperative";
import { pushSnapshot } from "../history";
import type { AppCtx } from "./_ctx";

export function onReconnectImpl(ctx: AppCtx, oldEdge: RFEdge, conn: Connection) {
  if (!conn.source || !conn.target || !conn.sourceHandle || !conn.targetHandle) return;
  if (!ctx.lastSpec.current) return;
  const rfNodes = rfGetNodes();
  const rfEdges = rfGetEdges();
  const specEdge = rfEdges.find((e) => e.id === oldEdge.id);
  if (!specEdge) return;
  const srcRF = rfNodes.find((n) => n.id === conn.source);
  const dstRF = rfNodes.find((n) => n.id === conn.target);
  if (!srcRF || !dstRF) return;
  const srcType = (srcRF.data?.type ?? srcRF.type) as string;
  const dstType = (dstRF.data?.type ?? dstRF.type) as string;
  const srcDef = NODE_TYPES[srcType];
  const dstDef = NODE_TYPES[dstType];
  const srcPort = srcDef?.outputs.find((p) => p.name === conn.sourceHandle);
  const dstPort = dstDef?.inputs.find((p) => p.name === conn.targetHandle);
  if (!srcPort || !dstPort) return;
  const newKind: EdgeKind = srcPort.kind === dstPort.kind ? srcPort.kind : "any";
  pushSnapshot();
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
