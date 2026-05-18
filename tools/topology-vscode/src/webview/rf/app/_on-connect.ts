import type { Connection } from "reactflow";
import { NODE_TYPES, type EdgeKind } from "../../../schema";
import { specToFlow } from "../adapter";
import { scheduleSave } from "../../save";
import { mutateSpec, spec, viewerState } from "../../state";
import { decodeGrowHandle } from "../port-rim-drag";
import type { AppCtx } from "./_ctx";

// Auto-name a new extra input port: in0, in1, in2, ... picking the first
// name not already used by any input on the node (kind-default or extra).
function nextInputName(existingNames: string[]): string {
  const taken = new Set(existingNames);
  for (let i = 0; ; i++) {
    const name = `in${i}`;
    if (!taken.has(name)) return name;
  }
}

export function onConnectImpl(ctx: AppCtx, conn: Connection) {
  if (ctx.isReadOnlyView()) return;
  if (!conn.source || !conn.target || !conn.sourceHandle || !conn.targetHandle) return;
  if (!ctx.lastSpec.current) return;
  const srcNode = spec.nodes.find((n) => n.id === conn.source);
  const dstNode = spec.nodes.find((n) => n.id === conn.target);
  if (!srcNode || !dstNode) return;
  const srcDef = NODE_TYPES[srcNode.type];
  const dstDef = NODE_TYPES[dstNode.type];
  const srcPort = srcDef?.outputs.find((p) => p.name === conn.sourceHandle)
    ?? (srcNode.outputs ?? []).find((p) => p.name === conn.sourceHandle);

  // Decode grow handle: __grow:<side>:<slot>
  const growDecode = decodeGrowHandle(conn.targetHandle);

  // For normal connections, dstPort must exist.
  // For grow connections, we synthesise the port below.
  const dstPort = growDecode
    ? null
    : dstDef?.inputs.find((p) => p.name === conn.targetHandle)
      ?? (dstNode.inputs ?? []).find((p) => p.name === conn.targetHandle);

  if (!srcPort) return;
  if (!growDecode && !dstPort) return;

  // Kind: source port kind; fall back to "any" on mismatch.
  const kind: EdgeKind = (dstPort && srcPort.kind === dstPort.kind) ? srcPort.kind
    : growDecode ? srcPort.kind
    : "any";

  // For grow connections: append new port to node.inputs, then treat the
  // new port name as the targetHandle.
  let resolvedTargetHandle = conn.targetHandle;
  if (growDecode) {
    const existingInputs = dstNode.inputs ?? dstDef?.inputs ?? [];
    const newName = nextInputName(existingInputs.map((p) => p.name));
    resolvedTargetHandle = newName;
    mutateSpec((s) => {
      const sn = s.nodes.find((nd) => nd.id === conn.target); if (!sn) return;
      const kindInputs = NODE_TYPES[sn.type]?.inputs ?? [];
      // Materialise per-instance inputs if not already present.
      if (sn.inputs === undefined) sn.inputs = structuredClone(kindInputs);
      sn.inputs.push({
        name: newName,
        kind: srcPort.kind,
        side: growDecode.side,
        slot: growDecode.slot,
      });
    });
  }

  const baseId = `${conn.source}.${conn.sourceHandle}->${conn.target}.${resolvedTargetHandle}`;
  let id = baseId;
  let n = 2;
  while (spec.edges.some((e) => e.id === id)) id = `${baseId}#${n++}`;
  // topogen uses edge.label verbatim as the channel variable name and
  // requires a valid Go identifier. Synthesize one; users can rename.
  const cap = (s: string) => (s.length === 0 ? s : s[0].toUpperCase() + s.slice(1));
  const baseLabel = `${conn.source}${cap(conn.sourceHandle)}To${cap(conn.target)}${cap(resolvedTargetHandle)}`
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
      targetHandle: resolvedTargetHandle,
      kind,
      label,
    });
  });
  ctx.lastSpec.current = next;
  const flow = specToFlow(next, viewerState.folds, viewerState);
  ctx.setNodes(flow.nodes);
  ctx.setEdges(flow.edges);
  scheduleSave();
}
