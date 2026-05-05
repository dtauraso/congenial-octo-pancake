import { useCallback, useState } from "react";
import type { Connection, Edge as RFEdge } from "reactflow";
import type { EdgeKind } from "../../../schema";
import { specToFlow } from "../adapter";
import { scheduleSave } from "../../save";
import { mutateSpec, spec, viewerState } from "../../state";
import type { AppCtx } from "./_ctx";
import { onConnectImpl } from "./_on-connect";
import { onReconnectImpl } from "./_on-reconnect";

export type EdgeMenu = { x: number; y: number; edgeId: string } | null;

export function useEdgeHandlers(ctx: AppCtx) {
  const [edgeMenu, setEdgeMenu] = useState<EdgeMenu>(null);

  // Input ports are 1-to-1: each target.handle is a single chan field on
  // the runtime node struct, so two senders into the same port can't be
  // wired. Returning false makes ReactFlow skip onConnect / onReconnect.
  const isValidConnection = useCallback((conn: Connection) => {
    if (!conn.target || !conn.targetHandle) return false;
    return !spec.edges.some(
      (e) => e.target === conn.target && e.targetHandle === conn.targetHandle,
    );
  }, []);

  const onConnect = useCallback((conn: Connection) => onConnectImpl(ctx, conn), [ctx]);
  const onReconnectStart = useCallback(() => { ctx.reconnectOk.current = false; }, [ctx]);
  const onReconnect = useCallback(
    (oldEdge: RFEdge, conn: Connection) => onReconnectImpl(ctx, oldEdge, conn),
    [ctx],
  );
  // Drop-in-empty-space leaves the edge untouched (reroute, not delete).
  const onReconnectEnd = useCallback(() => { ctx.reconnectOk.current = false; }, [ctx]);

  const onEdgeContextMenu = useCallback((ev: React.MouseEvent, edge: RFEdge) => {
    ev.preventDefault();
    setEdgeMenu({ x: ev.clientX, y: ev.clientY, edgeId: edge.id });
  }, []);

  const closeEdgeMenu = useCallback(() => setEdgeMenu(null), []);

  const setEdgeKind = useCallback((edgeId: string, kind: EdgeKind) => {
    if (ctx.isReadOnlyView()) return;
    if (!ctx.lastSpec.current) return;
    if (!spec.edges.some((e) => e.id === edgeId)) return;
    const next = mutateSpec((s) => {
      const e = s.edges.find((x) => x.id === edgeId);
      if (e) e.kind = kind;
    });
    ctx.lastSpec.current = next;
    const flow = specToFlow(next, viewerState.folds);
    ctx.setNodes(flow.nodes);
    ctx.setEdges(flow.edges);
    scheduleSave();
    setEdgeMenu(null);
  }, [ctx]);

  return {
    edgeMenu, isValidConnection, onConnect, onReconnectStart, onReconnect,
    onReconnectEnd, onEdgeContextMenu, closeEdgeMenu, setEdgeKind,
  };
}
