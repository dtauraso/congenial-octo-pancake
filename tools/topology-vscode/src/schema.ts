// Node-type registry. Single source of truth for ports and visual styling.
// `kind` values must match SVG edge classes from docs/svg-style-guide.md §5.

export type EdgeKind =
  | "chain"
  | "signal"
  | "feedback-ack"
  | "release"
  | "streak"
  | "pointer"
  | "and-out"
  | "edge-connection"
  | "inhibit-in"
  | "any";

const EDGE_KINDS: readonly EdgeKind[] = [
  "chain", "signal", "feedback-ack", "release", "streak",
  "pointer", "and-out", "edge-connection", "inhibit-in", "any",
];

export type Port = { name: string; kind: EdgeKind };
export type StateValue = string | number;

export type Node = {
  id: string;
  type: string;
  role?: string;
  x: number;
  y: number;
  index?: number;
  sublabel?: string;
  value?: string;
  state?: Record<string, StateValue>;
  // Per-instance config consumed by simulator handlers (e.g. delay,
  // inputCount). Defaults come from NODE_TYPES[type].defaultProps; spec
  // only stores overrides.
  props?: Record<string, StateValue>;
  data?: unknown;
};

// Simulator handler formalism (Phase 5.5). A handler is a pure function
// (state, input, props) → (state', emissions). Registered per node-type
// per input-port in src/sim/handlers.ts. Animation behavior is derived
// from these handlers running in the simulator, not from a global clock.
export type Emission = {
  port: string;
  value: StateValue;
  // Ticks until the emission becomes visible at the destination. Defaults
  // to 1 if omitted.
  delay?: number;
};

export type HandlerState = Record<string, StateValue>;
export type HandlerInput = { port: string; value: StateValue };
export type HandlerResult = { state: HandlerState; emissions: Emission[] };
export type HandlerFn = (
  state: HandlerState,
  input: HandlerInput,
  props: Record<string, StateValue>,
) => HandlerResult;

export type EdgeRoute = "line" | "snake" | "below";
export type ArrowStyle = "filled" | "open";

export type Edge = {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  kind: EdgeKind;
  label?: string;
  valueLabel?: string;
  route?: EdgeRoute;
  lane?: number;
  arrowStyle?: ArrowStyle;
  data?: unknown;
  // Concurrency-reveal override. `undefined` → auto-classify (forward
  // reachability from gate node types). `true` forces self-pacing
  // re-emission; `false` suppresses it even if auto-classify says yes.
  concurrent?: boolean;
};

export type LegendRow = { kind: EdgeKind; name: string; desc: string };
export type Note = { x: number; y: number; width?: number; height?: number; text: string };

export type SeedEvent = {
  nodeId: string;
  outPort: string;
  value: StateValue;
  // Optional ignition tick. Defaults to 0 (all seed events fire on the
  // first simulator tick).
  atTick?: number;
};

export type Spec = {
  nodes: Node[];
  edges: Edge[];
  timing?: {
    duration?: string;
    // Initial events that ignite the simulation. Phase 5.5 replaced
    // the SVG-era `steps[]` master script with this. Legacy `steps`
    // fields in older topology.json files are silently dropped at
    // parse time.
    seed?: SeedEvent[];
  };
  // Cycle counter source. If set, the cycle counter increments each
  // time the named node fires. If unset, the simulator falls back to
  // (ii-a) quiescent-input — cycle increments each time the in-flight
  // queues drain to empty. Topologies that never quiesce (continuous
  // self-sustain) must set this.
  cycleAnchor?: string;
  legend?: LegendRow[];
  notes?: Note[];
};

export type NodeTypeDef = {
  role: string;
  inputs: Port[];
  outputs: Port[];
  shape: "rect" | "pill";
  fill: string;
  stroke: string;
  width: number;
  height: number;
  // Defaults for spec.nodes[i].props. Spec only stores overrides; the
  // simulator merges defaults under the override at handler-call time.
  defaultProps?: Record<string, StateValue>;
};

export const NODE_TYPES: Record<string, NodeTypeDef> = {
  Generic: {
    role: "generic",
    inputs: [],
    outputs: [],
    shape: "rect", fill: "#ffffff", stroke: "#888", width: 110, height: 60,
  },
  Input: {
    role: "input",
    inputs: [],
    outputs: [
      { name: "out", kind: "chain" },
      { name: "ready", kind: "signal" },
    ],
    shape: "rect", fill: "#e0e0e0", stroke: "#666", width: 80, height: 60,
  },
  ReadLatch: {
    role: "latch",
    inputs: [{ name: "in", kind: "chain" }, { name: "release", kind: "release" }],
    outputs: [{ name: "out", kind: "chain" }, { name: "ack", kind: "feedback-ack" }],
    shape: "rect", fill: "#e0f7fa", stroke: "#00838f", width: 90, height: 50,
    defaultProps: { delay: 1 },
  },
  ChainInhibitor: {
    role: "inhibitor",
    inputs: [{ name: "in", kind: "chain" }],
    outputs: [
      { name: "out", kind: "chain" },
      { name: "readOld", kind: "edge-connection" },
      { name: "readNew", kind: "edge-connection" },
      { name: "inhibitOut", kind: "inhibit-in" },
    ],
    shape: "rect", fill: "#fff3e0", stroke: "#e65100", width: 90, height: 60,
  },
  InhibitRightGate: {
    role: "inhibit-right-gate",
    inputs: [
      { name: "left", kind: "inhibit-in" },
      { name: "right", kind: "inhibit-in" },
    ],
    outputs: [{ name: "out", kind: "and-out" }],
    shape: "rect", fill: "#fce4ec", stroke: "#880e4f", width: 110, height: 36,
  },
  DetectorLatch: {
    role: "latch",
    inputs: [{ name: "in", kind: "chain" }, { name: "release", kind: "release" }],
    outputs: [{ name: "out", kind: "chain" }, { name: "ack", kind: "feedback-ack" }],
    shape: "rect", fill: "#e0f7fa", stroke: "#00838f", width: 90, height: 50,
    defaultProps: { delay: 1 },
  },
  StreakBreakDetector: {
    role: "sbd",
    inputs: [
      { name: "old", kind: "edge-connection" },
      { name: "new", kind: "edge-connection" },
    ],
    outputs: [{ name: "done", kind: "signal" }],
    shape: "pill", fill: "#ffebee", stroke: "#c62828", width: 110, height: 40,
  },
  StreakDetector: {
    role: "sd",
    inputs: [
      { name: "old", kind: "edge-connection" },
      { name: "new", kind: "edge-connection" },
    ],
    outputs: [{ name: "done", kind: "signal" }, { name: "streak", kind: "streak" }],
    shape: "pill", fill: "#e8f5e9", stroke: "#2e7d32", width: 100, height: 40,
  },
  AndGate: {
    role: "and-gate",
    inputs: [{ name: "a", kind: "signal" }, { name: "b", kind: "signal" }],
    outputs: [{ name: "out", kind: "and-out" }],
    shape: "rect", fill: "#f3e5f5", stroke: "#7b1fa2", width: 70, height: 40,
    defaultProps: { inputCount: 2 },
  },
  PatternAnd: {
    role: "pattern-and",
    inputs: [{ name: "a", kind: "signal" }, { name: "b", kind: "signal" }],
    outputs: [{ name: "out", kind: "and-out" }],
    shape: "rect", fill: "#e8eaf6", stroke: "#283593", width: 70, height: 40,
  },
  SyncGate: {
    role: "sync-gate",
    inputs: [{ name: "a", kind: "signal" }, { name: "b", kind: "signal" }],
    outputs: [{ name: "release", kind: "release" }],
    shape: "rect", fill: "#f3e5f5", stroke: "#7b1fa2", width: 70, height: 40,
  },
  ReadGate: {
    role: "and-gate",
    inputs: [{ name: "chainIn", kind: "chain" }, { name: "ack", kind: "feedback-ack" }],
    outputs: [{ name: "out", kind: "chain" }],
    shape: "rect", fill: "#f3e5f5", stroke: "#7b1fa2", width: 70, height: 40,
  },
  Partition: {
    role: "partition",
    inputs: [{ name: "in", kind: "chain" }],
    outputs: [{ name: "out", kind: "chain" }],
    shape: "rect", fill: "#fce4ec", stroke: "#ad1457", width: 90, height: 50,
    defaultProps: { slidePx: 30 },
  },
};

export const KIND_COLORS: Record<EdgeKind, string> = {
  "chain": "#333",
  "signal": "#7b1fa2",
  "feedback-ack": "#7b1fa2",
  "release": "#00838f",
  "streak": "#2e7d32",
  "pointer": "#e65100",
  "and-out": "#283593",
  "edge-connection": "#2266aa",
  "inhibit-in": "#880e4f",
  "any": "#888",
};

class ParseError extends Error {}
const fail = (path: string, msg: string): never => {
  throw new ParseError(`${path}: ${msg}`);
};

const isObj = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

const str = (v: unknown, path: string): string =>
  typeof v === "string" ? v : fail(path, `expected string, got ${typeof v}`);
const num = (v: unknown, path: string): number =>
  typeof v === "number" ? v : fail(path, `expected number, got ${typeof v}`);
const bool = (v: unknown, path: string): boolean =>
  typeof v === "boolean" ? v : fail(path, `expected boolean, got ${typeof v}`);
const obj = (v: unknown, path: string): Record<string, unknown> =>
  isObj(v) ? v : fail(path, `expected object, got ${Array.isArray(v) ? "array" : typeof v}`);
const arr = (v: unknown, path: string): unknown[] =>
  Array.isArray(v) ? v : fail(path, `expected array, got ${typeof v}`);

const opt = <T>(v: unknown, fn: (v: unknown) => T): T | undefined =>
  v === undefined ? undefined : fn(v);

const oneOf = <T extends string>(v: unknown, allowed: readonly T[], path: string): T =>
  typeof v === "string" && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : fail(path, `expected one of ${allowed.join("|")}, got ${JSON.stringify(v)}`);

const stateValue = (v: unknown, path: string): StateValue =>
  typeof v === "string" || typeof v === "number"
    ? v
    : fail(path, `expected string|number, got ${typeof v}`);

const stateMap = (v: unknown, path: string): Record<string, StateValue> => {
  const o = obj(v, path);
  const out: Record<string, StateValue> = {};
  for (const k of Object.keys(o)) out[k] = stateValue(o[k], `${path}.${k}`);
  return out;
};

function parseNode(v: unknown, path: string): Node {
  const o = obj(v, path);
  return {
    id: str(o.id, `${path}.id`),
    type: str(o.type, `${path}.type`),
    role: opt(o.role, (x) => str(x, `${path}.role`)),
    x: num(o.x, `${path}.x`),
    y: num(o.y, `${path}.y`),
    index: opt(o.index, (x) => num(x, `${path}.index`)),
    sublabel: opt(o.sublabel, (x) => str(x, `${path}.sublabel`)),
    value: opt(o.value, (x) => str(x, `${path}.value`)),
    state: opt(o.state, (x) => stateMap(x, `${path}.state`)),
    props: opt(o.props, (x) => stateMap(x, `${path}.props`)),
    data: o.data,
  };
}

function parseEdge(v: unknown, path: string): Edge {
  const o = obj(v, path);
  return {
    id: str(o.id, `${path}.id`),
    source: str(o.source, `${path}.source`),
    sourceHandle: str(o.sourceHandle, `${path}.sourceHandle`),
    target: str(o.target, `${path}.target`),
    targetHandle: str(o.targetHandle, `${path}.targetHandle`),
    kind: oneOf(o.kind, EDGE_KINDS, `${path}.kind`),
    label: opt(o.label, (x) => str(x, `${path}.label`)),
    valueLabel: opt(o.valueLabel, (x) => str(x, `${path}.valueLabel`)),
    route: opt(o.route, (x) => oneOf(x, ["line", "snake", "below"] as const, `${path}.route`)),
    lane: opt(o.lane, (x) => num(x, `${path}.lane`)),
    arrowStyle: opt(o.arrowStyle, (x) => oneOf(x, ["filled", "open"] as const, `${path}.arrowStyle`)),
    concurrent: opt(o.concurrent, (x) => bool(x, `${path}.concurrent`)),
    data: o.data,
  };
}

function parseSeedEvent(v: unknown, path: string): SeedEvent {
  const o = obj(v, path);
  return {
    nodeId: str(o.nodeId, `${path}.nodeId`),
    outPort: str(o.outPort, `${path}.outPort`),
    value: stateValue(o.value, `${path}.value`),
    atTick: opt(o.atTick, (x) => num(x, `${path}.atTick`)),
  };
}

function parseLegendRow(v: unknown, path: string): LegendRow {
  const o = obj(v, path);
  return {
    kind: oneOf(o.kind, EDGE_KINDS, `${path}.kind`),
    name: str(o.name, `${path}.name`),
    desc: str(o.desc, `${path}.desc`),
  };
}

function parseNote(v: unknown, path: string): Note {
  const o = obj(v, path);
  return {
    x: num(o.x, `${path}.x`),
    y: num(o.y, `${path}.y`),
    width: opt(o.width, (x) => num(x, `${path}.width`)),
    height: opt(o.height, (x) => num(x, `${path}.height`)),
    text: str(o.text, `${path}.text`),
  };
}

function validatePorts(s: Spec): void {
  const byId = new Map(s.nodes.map((n) => [n.id, n]));
  const issues: string[] = [];
  for (const e of s.edges) {
    const src = byId.get(e.source);
    const dst = byId.get(e.target);
    if (!src) { issues.push(`edge ${e.id}: unknown source ${e.source}`); continue; }
    if (!dst) { issues.push(`edge ${e.id}: unknown target ${e.target}`); continue; }
    const srcDef = NODE_TYPES[src.type];
    const dstDef = NODE_TYPES[dst.type];
    if (srcDef && e.sourceHandle && !srcDef.outputs.some((p) => p.name === e.sourceHandle)) {
      issues.push(`edge ${e.id}: ${src.type} has no output port "${e.sourceHandle}"`);
    }
    if (dstDef && e.targetHandle && !dstDef.inputs.some((p) => p.name === e.targetHandle)) {
      issues.push(`edge ${e.id}: ${dst.type} has no input port "${e.targetHandle}"`);
    }
  }
  if (issues.length) throw new ParseError(issues.join("\n"));
}

export function parseSpec(input: unknown): Spec {
  const o = obj(input, "spec");
  const spec: Spec = {
    nodes: arr(o.nodes, "spec.nodes").map((n, i) => parseNode(n, `spec.nodes[${i}]`)),
    edges: arr(o.edges, "spec.edges").map((e, i) => parseEdge(e, `spec.edges[${i}]`)),
    timing: opt(o.timing, (t) => {
      const to = obj(t, "spec.timing");
      // Legacy `steps` field is silently dropped — it was the SVG-era
      // master script, replaced by per-node handlers + seed events in
      // Phase 5.5.
      return {
        duration: opt(to.duration, (x) => str(x, "spec.timing.duration")),
        seed: opt(to.seed, (x) =>
          arr(x, "spec.timing.seed").map((e, i) => parseSeedEvent(e, `spec.timing.seed[${i}]`))),
      };
    }),
    cycleAnchor: opt(o.cycleAnchor, (x) => str(x, "spec.cycleAnchor")),
    legend: opt(o.legend, (l) =>
      arr(l, "spec.legend").map((r, i) => parseLegendRow(r, `spec.legend[${i}]`))),
    notes: opt(o.notes, (l) =>
      arr(l, "spec.notes").map((n, i) => parseNote(n, `spec.notes[${i}]`))),
  };
  validatePorts(spec);
  return spec;
}
