import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background, Controls, MiniMap,
  addEdge, applyEdgeChanges, applyNodeChanges,
  Connection, Edge, Node, NodeChange, EdgeChange,
  ReactFlowProvider, useReactFlow,
} from "reactflow";
import { NODE_TYPES, KIND_COLORS, EdgeKind, Port } from "./schema";
import { TopologyNode, TopologyNodeData, effectivePorts } from "./TopologyNode";
import { FeedbackAckEdge } from "./FeedbackAckEdge";
import { loadFromSvg } from "./loadFromSvg";
import cascadeSvg from "../../../diagrams/topology-chain-cascade.svg?raw";

const ALL_KINDS: EdgeKind[] = [
  "chain", "signal", "feedback-ack", "release",
  "streak", "pointer", "and-out", "edge-connection", "any",
];

const ANIMATED_KINDS = new Set<EdgeKind>(["feedback-ack", "release", "signal"]);

type EdgeData = { kind: EdgeKind; init?: number[] };
type TNode = Node<TopologyNodeData>;
type TEdge = Edge<EdgeData>;

const nodeTypes = { topology: TopologyNode };
const edgeTypes = { feedbackAck: FeedbackAckEdge };

function edgeId(source: string, sourceHandle: string, target: string, targetHandle: string): string {
  return `${source}.${sourceHandle}->${target}.${targetHandle}`;
}

function styledEdge(
  source: string, sourceHandle: string,
  target: string, targetHandle: string,
  kind: EdgeKind, label?: string, init?: number[],
): TEdge {
  return {
    id: edgeId(source, sourceHandle, target, targetHandle),
    source, sourceHandle, target, targetHandle,
    type: kind === "feedback-ack" ? "feedbackAck" : undefined,
    label,
    labelStyle: { fontSize: 10, fill: "#111", fontWeight: 300 },
    labelBgStyle: { fill: "#fafafa", fillOpacity: 0.85 },
    labelBgPadding: [3, 2],
    data: { kind, init },
    style: {
      stroke: KIND_COLORS[kind],
      strokeWidth: 1.5,
      strokeDasharray: kind === "pointer" ? "4 3" : undefined,
    },
    animated: ANIMATED_KINDS.has(kind),
  };
}

const initial = loadFromSvg(cascadeSvg);
const STARTER_NODES: TNode[] = initial.nodes;
const STARTER_EDGES: TEdge[] = initial.edges.map(e =>
  styledEdge(e.source, e.sourceHandle, e.target, e.targetHandle, e.kind, e.label, e.init),
);

function portKindOf(node: TNode | undefined, portName: string, side: "in" | "out"): EdgeKind | undefined {
  if (!node) return undefined;
  const { inputs, outputs } = effectivePorts(node.data);
  const list = side === "in" ? inputs : outputs;
  return list.find(p => p.name === portName)?.kind;
}

function Editor() {
  const [nodes, setNodes] = useState<TNode[]>(STARTER_NODES);
  const [edges, setEdges] = useState<Edge[]>(STARTER_EDGES);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const rf = useReactFlow();

  const onNodesChange = useCallback((c: NodeChange[]) =>
    setNodes(ns => applyNodeChanges(c, ns)), []);
  const onEdgesChange = useCallback((c: EdgeChange[]) =>
    setEdges(es => applyEdgeChanges(c, es)), []);

  const kindsCompatible = (a: EdgeKind | undefined, b: EdgeKind | undefined): boolean => {
    if (!a || !b) return false;
    if (a === "any" || b === "any") return true;
    return a === b;
  };

  const resolveKind = (a: EdgeKind, b: EdgeKind): EdgeKind => {
    if (a === "any") return b;
    return a;
  };

  const isValidConnection = useCallback((c: Connection) => {
    const src = nodes.find(n => n.id === c.source);
    const tgt = nodes.find(n => n.id === c.target);
    if (!src || !tgt || !c.sourceHandle || !c.targetHandle) return false;
    const sk = portKindOf(src, c.sourceHandle, "out");
    const tk = portKindOf(tgt, c.targetHandle, "in");
    return kindsCompatible(sk, tk);
  }, [nodes]);

  const onConnect = useCallback((c: Connection) => {
    const src = nodes.find(n => n.id === c.source);
    const tgt = nodes.find(n => n.id === c.target);
    const sk = src && c.sourceHandle ? portKindOf(src, c.sourceHandle, "out") : undefined;
    const tk = tgt && c.targetHandle ? portKindOf(tgt, c.targetHandle, "in") : undefined;
    if (!kindsCompatible(sk, tk)) {
      setError(`port-kind mismatch: ${sk ?? "?"} → ${tk ?? "?"}`);
      setTimeout(() => setError(null), 3000);
      return;
    }
    const kind = resolveKind(sk!, tk!);
    setEdges(es => addEdge(
      styledEdge(c.source!, c.sourceHandle!, c.target!, c.targetHandle!, kind),
      es,
    ));
  }, [nodes]);

  const addNode = (type: keyof typeof NODE_TYPES) => {
    const id = `${type[0].toLowerCase() + type.slice(1)}_${Date.now().toString(36).slice(-4)}`;
    const data: TopologyNodeData =
      type === "Generic"
        ? {
            type,
            label: "newNode",
            inputs: [{ name: "in", kind: "any" }],
            outputs: [{ name: "out", kind: "any" }],
          }
        : { type };
    setNodes(ns => [...ns, {
      id, type: "topology",
      position: { x: 100 + Math.random() * 400, y: 100 + Math.random() * 300 },
      data,
    }]);
    setSelectedId(id);
  };

  const updateNodeData = (id: string, patch: Partial<TopologyNodeData>) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n));
  };

  const updateEdgeData = (id: string, patch: Partial<EdgeData>) => {
    setEdges(es => es.map(e => {
      if (e.id !== id) return e;
      const data = { ...(e.data ?? { kind: "any" as EdgeKind }), ...patch };
      return { ...e, data };
    }));
  };

  const renameNode = (oldId: string, newId: string) => {
    if (!newId || newId === oldId || nodes.some(n => n.id === newId)) return;
    setNodes(ns => ns.map(n => n.id === oldId ? { ...n, id: newId } : n));
    setEdges(es => es.map(e => {
      const source = e.source === oldId ? newId : e.source;
      const target = e.target === oldId ? newId : e.target;
      return { ...e, source, target,
               id: edgeId(source, e.sourceHandle ?? "", target, e.targetHandle ?? "") };
    }));
    setSelectedId(newId);
  };

  const removeNode = (id: string) => {
    setNodes(ns => ns.filter(n => n.id !== id));
    setEdges(es => es.filter(e => e.source !== id && e.target !== id));
    setSelectedId(null);
  };

  const buildSpec = () => {
    return {
      nodes: nodes.map(n => {
        const out: Record<string, unknown> = {
          id: n.id, type: n.data.type, role: NODE_TYPES[n.data.type]?.role,
          x: Math.round(n.position.x), y: Math.round(n.position.y),
        };
        if (n.data.index !== undefined) out.index = n.data.index;
        const data: Record<string, unknown> = {};
        if (n.data.init?.length) data.init = n.data.init;
        if (Object.keys(data).length > 0) out.data = data;
        return out;
      }),
      edges: edges.map(e => {
        const d = e.data as EdgeData | undefined;
        const out: Record<string, unknown> = {
          id: e.id, source: e.source, sourceHandle: e.sourceHandle,
          target: e.target, targetHandle: e.targetHandle,
          kind: d?.kind,
        };
        if (typeof e.label === "string") out.label = e.label;
        const data: Record<string, unknown> = {};
        if (d?.init?.length) data.init = d.init;
        if (Object.keys(data).length > 0) out.data = data;
        return out;
      }),
    };
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(buildSpec(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "topology.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (file: File) => {
    file.text().then(text => {
      const spec = JSON.parse(text);
      const ns: TNode[] = spec.nodes.map((n: { id: string; type: string; index?: number; x: number; y: number; data?: { init?: number[] } }) => ({
        id: n.id, type: "topology",
        position: { x: n.x, y: n.y },
        data: { type: n.type as keyof typeof NODE_TYPES, index: n.index, init: n.data?.init },
      }));
      const es: TEdge[] = spec.edges.map((e: { source: string; sourceHandle: string; target: string; targetHandle: string; kind: EdgeKind; label?: string; data?: { init?: number[] } }) =>
        styledEdge(e.source, e.sourceHandle, e.target, e.targetHandle, e.kind, e.label, e.data?.init),
      );
      setNodes(ns); setEdges(es);
      setTimeout(() => rf.fitView(), 50);
    });
  };

  const palette = useMemo(
    () => (Object.keys(NODE_TYPES) as (keyof typeof NODE_TYPES)[]).filter(t => t !== "Generic"),
    [],
  );

  // Autosave: debounce changes, POST to /api/spec which writes topology.json
  // and re-runs topogen. Requires `go run ./cmd/topogend` running in another shell.
  useEffect(() => {
    if (!autoSave) return;
    if (nodes.length === 0) return;
    const t = setTimeout(async () => {
      setSaveStatus("saving");
      setSaveError(null);
      try {
        const res = await fetch("/api/spec", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(buildSpec(), null, 2),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        setSaveStatus("saved");
      } catch (err) {
        setSaveStatus("error");
        setSaveError(err instanceof Error ? err.message : String(err));
      }
    }, 600);
    return () => clearTimeout(t);
    // buildSpec closes over nodes/edges; rerun whenever they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, autoSave]);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      {showPalette ? (
      <aside style={{
        width: 200, padding: 12, borderRight: "1px solid #ddd",
        background: "#fafafa", overflowY: "auto", fontFamily: "ui-sans-serif, system-ui",
        fontSize: 12,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 13, margin: 0 }}>Topology Editor</h3>
          <button onClick={() => setShowPalette(false)}
                  title="hide palette"
                  style={{ fontSize: 11, padding: "2px 6px" }}>‹</button>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, marginBottom: 6 }}>
            <input type="checkbox" checked={autoSave} onChange={e => setAutoSave(e.target.checked)} />
            Autosave to disk
          </label>
          <div style={{ fontSize: 10, marginBottom: 6,
                        color: saveStatus === "error" ? "#c62828"
                             : saveStatus === "saving" ? "#f57f17"
                             : saveStatus === "saved" ? "#2e7d32"
                             : "#888" }}>
            {!autoSave ? "autosave off"
              : saveStatus === "idle" ? "ready"
              : saveStatus === "saving" ? "saving…"
              : saveStatus === "saved" ? "✓ saved + regenerated"
              : `✗ ${saveError ?? "error"}`}
          </div>
          <button onClick={exportJson} style={{ width: "100%", marginBottom: 4 }}>Download JSON</button>
          <button onClick={() => fileInput.current?.click()} style={{ width: "100%" }}>Load JSON</button>
          <input ref={fileInput} type="file" accept="application/json"
                 style={{ display: "none" }}
                 onChange={e => e.target.files?.[0] && importJson(e.target.files[0])} />
        </div>
        <button
          onClick={() => addNode("Generic")}
          style={{ width: "100%", marginBottom: 10, padding: "8px",
                   background: "#fff", border: "2px dashed #888",
                   color: "#333", fontSize: 12, fontWeight: 600,
                   borderRadius: 4, cursor: "pointer" }}
        >+ New Generic Node</button>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Add Node</div>
        {palette.map(t => (
          <button key={t} onClick={() => addNode(t)}
                  style={{ display: "block", width: "100%", marginBottom: 2,
                           textAlign: "left", padding: "4px 6px",
                           border: `1px solid ${NODE_TYPES[t].stroke}`,
                           background: NODE_TYPES[t].fill,
                           color: NODE_TYPES[t].stroke, fontSize: 11,
                           borderRadius: 4, cursor: "pointer" }}>
            + {t}
          </button>
        ))}
        <div style={{ fontWeight: 600, marginTop: 16, marginBottom: 4 }}>Edge kinds</div>
        {(Object.entries(KIND_COLORS) as [EdgeKind, string][]).map(([k, c]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{ display: "inline-block", width: 18, height: 2, background: c }} />
            <span style={{ fontSize: 10 }}>{k}</span>
          </div>
        ))}
        <div style={{ fontSize: 10, color: "#666", marginTop: 16, lineHeight: 1.4 }}>
          Drag from a colored port handle to another of the same color. Mismatched
          connections are rejected.
        </div>
      </aside>
      ) : (
        <button onClick={() => setShowPalette(true)}
                title="show palette"
                style={{ position: "absolute", top: 12, left: 12, zIndex: 10,
                         fontSize: 12, padding: "4px 8px",
                         background: "#fafafa", border: "1px solid #ddd",
                         borderRadius: 4, cursor: "pointer" }}>› palette</button>
      )}
      <div style={{ flex: 1, position: "relative" }}>
        {error && (
          <div style={{
            position: "absolute", top: 12, left: 12, zIndex: 10,
            background: "#c62828", color: "white", padding: "6px 12px",
            borderRadius: 4, fontSize: 12, fontFamily: "ui-sans-serif",
          }}>{error}</div>
        )}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          onSelectionChange={({ nodes: nsel, edges: esel }) => {
            setSelectedId(nsel[0]?.id ?? null);
            setSelectedEdgeId(esel[0]?.id ?? null);
          }}
          fitView
        >
          <Background gap={16} />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>
      {(selectedId || (selectedEdgeId && !selectedId)) && !showInspector && (
        <button onClick={() => setShowInspector(true)}
                title="show inspector"
                style={{ position: "absolute", top: 12, right: 12, zIndex: 10,
                         fontSize: 12, padding: "4px 8px",
                         background: "#fafafa", border: "1px solid #ddd",
                         borderRadius: 4, cursor: "pointer" }}>‹ inspector</button>
      )}
      {selectedId && showInspector && (
        <Inspector
          node={nodes.find(n => n.id === selectedId)!}
          onUpdate={patch => updateNodeData(selectedId, patch)}
          onRename={newId => renameNode(selectedId, newId)}
          onRemove={() => removeNode(selectedId)}
          onHide={() => setShowInspector(false)}
        />
      )}
      {!selectedId && selectedEdgeId && showInspector && (() => {
        const edge = edges.find(e => e.id === selectedEdgeId);
        if (!edge) return null;
        return (
          <EdgeInspector
            edge={edge}
            onUpdate={patch => updateEdgeData(selectedEdgeId, patch)}
            onHide={() => setShowInspector(false)}
          />
        );
      })()}
    </div>
  );
}

function Inspector({
  node, onUpdate, onRename, onRemove, onHide,
}: {
  node: TNode;
  onUpdate: (patch: Partial<TopologyNodeData>) => void;
  onRename: (id: string) => void;
  onRemove: () => void;
  onHide: () => void;
}) {
  const isGeneric = node.data.type === "Generic";
  const { inputs, outputs } = effectivePorts(node.data);
  const [idDraft, setIdDraft] = useState(node.id);
  // Resync draft when selection changes.
  useEffect(() => { setIdDraft(node.id); }, [node.id]);

  const setPorts = (side: "inputs" | "outputs", ports: Port[]) =>
    onUpdate({ [side]: ports } as Partial<TopologyNodeData>);

  const addPort = (side: "inputs" | "outputs") => {
    const list = side === "inputs" ? inputs : outputs;
    const used = new Set(list.map(p => p.name));
    let n = list.length;
    let name = `p${n}`;
    while (used.has(name)) name = `p${++n}`;
    setPorts(side, [...list, { name, kind: "any" }]);
  };

  const updatePort = (side: "inputs" | "outputs", i: number, patch: Partial<Port>) => {
    const list = side === "inputs" ? inputs : outputs;
    setPorts(side, list.map((p, j) => j === i ? { ...p, ...patch } : p));
  };

  const removePort = (side: "inputs" | "outputs", i: number) => {
    const list = side === "inputs" ? inputs : outputs;
    setPorts(side, list.filter((_, j) => j !== i));
  };

  const portRow = (side: "inputs" | "outputs", p: Port, i: number) => (
    <div key={side + i} style={{ display: "flex", gap: 4, marginBottom: 3 }}>
      <input
        value={p.name}
        onChange={e => updatePort(side, i, { name: e.target.value })}
        disabled={!isGeneric}
        style={{ flex: 1, fontSize: 11, padding: "2px 4px", minWidth: 0 }}
      />
      <select
        value={p.kind}
        onChange={e => updatePort(side, i, { kind: e.target.value as EdgeKind })}
        disabled={!isGeneric}
        style={{ fontSize: 11, padding: "2px",
                 background: KIND_COLORS[p.kind], color: "#fff", border: "none" }}
      >
        {ALL_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
      </select>
      {isGeneric && (
        <button onClick={() => removePort(side, i)}
                style={{ fontSize: 11, padding: "0 6px" }}>×</button>
      )}
    </div>
  );

  return (
    <aside style={{
      width: 260, padding: 12, borderLeft: "1px solid #ddd",
      background: "#fafafa", overflowY: "auto",
      fontFamily: "ui-sans-serif, system-ui", fontSize: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 13, margin: 0 }}>Inspector</h3>
        <button onClick={onHide} title="hide inspector"
                style={{ fontSize: 11, padding: "2px 6px" }}>›</button>
      </div>
      <div style={{ marginTop: 10 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 2 }}>id</label>
        <div style={{ display: "flex", gap: 4 }}>
          <input value={idDraft} onChange={e => setIdDraft(e.target.value)}
                 style={{ flex: 1, fontSize: 11, padding: "2px 4px", minWidth: 0 }} />
          <button onClick={() => onRename(idDraft)} style={{ fontSize: 11, padding: "0 6px" }}>set</button>
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 2 }}>label</label>
        <input value={node.data.label ?? ""} onChange={e => onUpdate({ label: e.target.value })}
               placeholder={node.data.type}
               style={{ width: "100%", fontSize: 11, padding: "2px 4px", boxSizing: "border-box" }} />
      </div>
      <div style={{ marginTop: 8 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 2 }}>type</label>
        <div style={{ fontSize: 11, color: "#555" }}>{node.data.type}</div>
      </div>

      <div style={{ marginTop: 14, fontWeight: 600 }}>Inputs</div>
      {inputs.map((p, i) => portRow("inputs", p, i))}
      {isGeneric && (
        <button onClick={() => addPort("inputs")}
                style={{ fontSize: 11, marginTop: 2 }}>+ input</button>
      )}

      <div style={{ marginTop: 12, fontWeight: 600 }}>Outputs</div>
      {outputs.map((p, i) => portRow("outputs", p, i))}
      {isGeneric && (
        <button onClick={() => addPort("outputs")}
                style={{ fontSize: 11, marginTop: 2 }}>+ output</button>
      )}

      <button onClick={onRemove}
              style={{ marginTop: 18, width: "100%", fontSize: 11,
                       background: "#c62828", color: "#fff", border: "none",
                       padding: "6px", borderRadius: 4 }}>
        Delete node
      </button>

      {node.data.type === "Input" && (
        <div style={{ marginTop: 14 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 2 }}>
            Init values (comma-separated)
          </label>
          <input
            value={(node.data.init ?? []).join(",")}
            onChange={e => onUpdate({ init: parseInts(e.target.value) })}
            placeholder="0,1,0"
            style={{ width: "100%", fontSize: 11, padding: "2px 4px", boxSizing: "border-box" }}
          />
          <div style={{ fontSize: 10, color: "#666", marginTop: 4 }}>
            Pre-loaded into this Input's external channel before goroutines start.
          </div>
        </div>
      )}

      {!isGeneric && (
        <div style={{ marginTop: 12, fontSize: 10, color: "#666", lineHeight: 1.4 }}>
          Ports of typed nodes are fixed by the schema. Use a Generic node to define ports inline.
        </div>
      )}
    </aside>
  );
}

function parseInts(s: string): number[] {
  return s.split(",").map(t => t.trim()).filter(t => t.length > 0)
    .map(t => parseInt(t, 10)).filter(n => !isNaN(n));
}

function EdgeInspector({
  edge, onUpdate, onHide,
}: {
  edge: TEdge;
  onUpdate: (patch: Partial<EdgeData>) => void;
  onHide: () => void;
}) {
  const kind = edge.data?.kind ?? "any";
  const init = edge.data?.init ?? [];
  return (
    <aside style={{
      width: 260, padding: 12, borderLeft: "1px solid #ddd",
      background: "#fafafa", overflowY: "auto",
      fontFamily: "ui-sans-serif, system-ui", fontSize: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 13, margin: 0 }}>Edge Inspector</h3>
        <button onClick={onHide} title="hide inspector"
                style={{ fontSize: 11, padding: "2px 6px" }}>›</button>
      </div>
      <div style={{ marginTop: 10 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 2 }}>label</label>
        <div style={{ fontSize: 11, color: "#555" }}>{String(edge.label ?? "")}</div>
      </div>
      <div style={{ marginTop: 8 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 2 }}>kind</label>
        <div style={{ fontSize: 11, color: KIND_COLORS[kind] }}>{kind}</div>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: "#555" }}>
        {edge.source}.{edge.sourceHandle} → {edge.target}.{edge.targetHandle}
      </div>

      <div style={{ marginTop: 14 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 2 }}>
          Priming values (comma-separated)
        </label>
        <input
          value={init.join(",")}
          onChange={e => onUpdate({ init: parseInts(e.target.value) })}
          placeholder="(none)"
          style={{ width: "100%", fontSize: 11, padding: "2px 4px", boxSizing: "border-box" }}
        />
        <div style={{ fontSize: 10, color: "#666", marginTop: 4, lineHeight: 1.4 }}>
          Sent into this channel at startup, before goroutines run. Used for breaking
          cycles (e.g. priming an ack edge with 1).
        </div>
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  );
}
