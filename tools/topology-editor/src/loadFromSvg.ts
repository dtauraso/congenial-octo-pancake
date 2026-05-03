import { Node } from "reactflow";
import { EdgeKind, NODE_TYPES } from "./schema";
import { TopologyNodeData } from "./TopologyNode";

export type EdgeSpec = {
  source: string; sourceHandle: string;
  target: string; targetHandle: string;
  kind: EdgeKind; label: string;
  init?: number[];
};

// Map SVG metadata role → editor node-type key.
const ROLE_TO_TYPE: Record<string, keyof typeof NODE_TYPES> = {
  "input": "Input",
  "and-gate": "ReadGate",
  "inhibitor": "ChainInhibitor",
  "inhibit-right-gate": "InhibitRightGate",
};

type MetaNode = { id: string; role: string; index?: number };
type MetaEdge = { id: string; source: string; target: string; kind: EdgeKind; label?: string };
type Meta = { nodes: MetaNode[]; edges: MetaEdge[] };

function extractMeta(svg: string): Meta {
  const m = svg.match(/<metadata>\s*([\s\S]*?)\s*<\/metadata>/);
  if (!m) throw new Error("no <metadata> block in SVG");
  const data = JSON.parse(m[1]);
  return { nodes: data.nodes ?? [], edges: data.edges ?? [] };
}

// Pull (x, y) from the first `<rect ... x="..." y="..." />` inside `<g id="node-X" ...>`.
function extractPositions(svg: string): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const groupRe = /<g\s+id="node-([^"]+)"[\s\S]*?<rect[^>]*\sx="(-?\d+(?:\.\d+)?)"[^>]*\sy="(-?\d+(?:\.\d+)?)"/g;
  let m: RegExpExecArray | null;
  while ((m = groupRe.exec(svg))) {
    positions[m[1]] = { x: parseFloat(m[2]), y: parseFloat(m[3]) };
  }
  return positions;
}

// Pick the first port of `kind` (or "any") that hasn't been claimed yet by a sibling edge.
function pickHandle(
  type: keyof typeof NODE_TYPES,
  side: "inputs" | "outputs",
  kind: EdgeKind,
  used: Set<string>,
): string | undefined {
  const ports = NODE_TYPES[type]?.[side] ?? [];
  // Prefer exact-kind match; fall back to "any".
  for (const p of ports) {
    if (p.kind === kind && !used.has(p.name)) return p.name;
  }
  for (const p of ports) {
    if (p.kind === "any" && !used.has(p.name)) return p.name;
  }
  // If no unused match, allow reuse.
  return ports.find(p => p.kind === kind)?.name ?? ports[0]?.name;
}

export function loadFromSvg(svg: string): {
  nodes: Node<TopologyNodeData>[];
  edges: EdgeSpec[];
} {
  const meta = extractMeta(svg);
  const pos = extractPositions(svg);

  const nodes: Node<TopologyNodeData>[] = meta.nodes.map(n => {
    const type = ROLE_TO_TYPE[n.role];
    const p = pos[n.id] ?? { x: 100 + Math.random() * 400, y: 100 + Math.random() * 300 };
    if (!type) {
      // Unknown role: drop a Generic node so the graph still loads.
      return {
        id: n.id, type: "topology", position: p,
        data: { type: "Generic", label: n.id,
                inputs: [{ name: "in", kind: "any" as EdgeKind }],
                outputs: [{ name: "out", kind: "any" as EdgeKind }] },
      };
    }
    return {
      id: n.id, type: "topology", position: p,
      data: {
        type, index: n.index,
        // Default init for the cascade's input node so the loop runs out of the box.
        init: type === "Input" ? [0, 1, 0] : undefined,
      },
    };
  });

  const nodeById = new Map(nodes.map(n => [n.id, n]));
  const usedOut = new Map<string, Set<string>>();
  const usedIn = new Map<string, Set<string>>();
  const claim = (m: Map<string, Set<string>>, key: string, h: string) => {
    const s = m.get(key) ?? new Set<string>();
    s.add(h); m.set(key, s); return s;
  };

  const edges: EdgeSpec[] = [];
  for (const e of meta.edges) {
    const src = nodeById.get(e.source);
    const tgt = nodeById.get(e.target);
    if (!src || !tgt) { console.warn(`skipping edge ${e.id}: unknown endpoint`); continue; }
    const sourceHandle = pickHandle(src.data.type, "outputs", e.kind, usedOut.get(e.source) ?? new Set());
    const targetHandle = pickHandle(tgt.data.type, "inputs",  e.kind, usedIn.get(e.target)  ?? new Set());
    if (!sourceHandle || !targetHandle) { console.warn(`skipping edge ${e.id}: no matching ${e.kind} port`); continue; }
    claim(usedOut, e.source, sourceHandle);
    claim(usedIn,  e.target, targetHandle);
    edges.push({
      source: e.source, sourceHandle, target: e.target, targetHandle,
      kind: e.kind, label: e.id,
      // Prime feedback-ack edges with [1] so cycles break on first iteration.
      init: e.kind === "feedback-ack" ? [1] : undefined,
    });
  }

  return { nodes, edges };
}
