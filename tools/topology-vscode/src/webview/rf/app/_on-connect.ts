import type { Connection } from "reactflow";
import { KIND_COLORS, NODE_TYPES, type EdgeKind } from "../../../schema";
import { scheduleSave } from "../../save";
import { rfGetNodes, rfGetEdges, rfSetNodes, rfSetEdges } from "../rf-imperative";
import { decodeGrowHandle } from "../port-rim-drag";
import { pushSnapshot } from "../history";
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
  if (!conn.source || !conn.target || !conn.sourceHandle || !conn.targetHandle) return;
  if (!ctx.lastSpec.current) return;
  const rfNodes = rfGetNodes();
  const rfEdges = rfGetEdges();
  const srcRF = rfNodes.find((n) => n.id === conn.source);
  const dstRF = rfNodes.find((n) => n.id === conn.target);
  if (!srcRF || !dstRF) return;
  const srcType = (srcRF.data?.type ?? srcRF.type) as string;
  const dstType = (dstRF.data?.type ?? dstRF.type) as string;
  const srcDef = NODE_TYPES[srcType];
  const dstDef = NODE_TYPES[dstType];
  const srcInputs: { name: string; kind: string }[] = srcRF.data?.inputs ?? [];
  const srcOutputs: { name: string; kind: string }[] = srcRF.data?.outputs ?? [];
  const dstInputs: { name: string; kind: string; side?: string; slot?: number }[] = dstRF.data?.inputs ?? [];
  const srcPort = srcDef?.outputs.find((p) => p.name === conn.sourceHandle)
    ?? srcOutputs.find((p) => p.name === conn.sourceHandle);

  // Decode grow handle: __grow:<side>:<slot>
  const growDecode = decodeGrowHandle(conn.targetHandle);

  // For normal connections, dstPort must exist.
  // For grow connections, we synthesise the port below.
  const dstPort = growDecode
    ? null
    : dstDef?.inputs.find((p) => p.name === conn.targetHandle)
      ?? dstInputs.find((p) => p.name === conn.targetHandle);

  if (!srcPort) return;
  if (!growDecode && !dstPort) return;

  // Kind: source port kind; fall back to "any" on mismatch.
  const kind: EdgeKind = (dstPort && srcPort.kind === dstPort.kind) ? (srcPort.kind as EdgeKind)
    : growDecode ? (srcPort.kind as EdgeKind)
    : "any";

  // For grow connections: append new port to node.inputs, then treat the
  // new port name as the targetHandle.
  let resolvedTargetHandle = conn.targetHandle;
  if (growDecode) {
    const existingInputs = dstInputs.length > 0 ? dstInputs : (dstDef?.inputs ?? []);
    const newName = nextInputName(existingInputs.map((p) => p.name));
    resolvedTargetHandle = newName;
    pushSnapshot();
    const newPort = { name: newName, kind: srcPort.kind, side: growDecode.side, slot: growDecode.slot };
    rfSetNodes((ns) => ns.map((nd) =>
      nd.id !== conn.target ? nd : {
        ...nd,
        data: { ...nd.data, inputs: [...(nd.data?.inputs ?? []), newPort] },
      }
    ));
  }

  const baseId = `${conn.source}.${conn.sourceHandle}->${conn.target}.${resolvedTargetHandle}`;
  let id = baseId;
  let n = 2;
  while (rfEdges.some((e) => e.id === id)) id = `${baseId}#${n++}`;
  // topogen uses edge.label verbatim as the channel variable name and
  // requires a valid Go identifier. Synthesize one; users can rename.
  const cap = (s: string) => (s.length === 0 ? s : s[0].toUpperCase() + s.slice(1));
  const baseLabel = `${conn.source}${cap(conn.sourceHandle)}To${cap(conn.target)}${cap(resolvedTargetHandle)}`
    .replace(/[^A-Za-z0-9_]/g, "_")
    .replace(/^([0-9])/, "_$1");
  let label = baseLabel;
  let m = 2;
  while (rfEdges.some((e) => e.data?.label === label)) label = `${baseLabel}_${m++}`;
  if (!growDecode) pushSnapshot();
  rfSetEdges((es) => [
    ...es,
    {
      id,
      source: conn.source!,
      sourceHandle: conn.sourceHandle!,
      target: conn.target!,
      targetHandle: resolvedTargetHandle,
      type: "animated",
      style: { stroke: KIND_COLORS[kind] ?? "#888", strokeWidth: 1.5 },
      data: {
        kind,
        label,
        sourceHandle: conn.sourceHandle!,
        targetHandle: resolvedTargetHandle,
      },
    },
  ]);
  scheduleSave();
}
