// Parsers for Node, Edge, NodeSpec, SpecSegment.

import { EDGE_KINDS } from "./types";
import type {
  Edge,
  Node,
  NodeSpec,
  SpecSegment,
} from "./types-graph";
import {
  arr,
  bool,
  fail,
  num,
  obj,
  oneOf,
  opt,
  stateMap,
  str,
} from "./parse-primitives";

function parseSpecSegment(v: unknown, path: string): SpecSegment {
  const o = obj(v, path);
  if ("text" in o) return { text: str(o.text, `${path}.text`) };
  if ("outputRef" in o) return { outputRef: str(o.outputRef, `${path}.outputRef`) };
  return fail(path, `expected {text} or {outputRef}, got ${JSON.stringify(o)}`);
}

function parseNodeSpec(v: unknown, path: string): NodeSpec {
  const o = obj(v, path);
  return {
    lang: str(o.lang, `${path}.lang`),
    segments: arr(o.segments, `${path}.segments`).map((s, i) =>
      parseSpecSegment(s, `${path}.segments[${i}]`),
    ),
  };
}

export function parseNode(v: unknown, path: string): Node {
  const o = obj(v, path);
  return {
    id: str(o.id, `${path}.id`),
    type: str(o.type, `${path}.type`),
    index: opt(o.index, (x) => num(x, `${path}.index`)),
    props: opt(o.props, (x) => stateMap(x, `${path}.props`)),
    spec: opt(o.spec, (x) => parseNodeSpec(x, `${path}.spec`)),
    notes: opt(o.notes, (x) => str(x, `${path}.notes`)),
    data: o.data,
  };
}

export function parseEdge(v: unknown, path: string): Edge {
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
    lane: opt(o.lane, (x) => num(x, `${path}.lane`)),
    arrowStyle: opt(o.arrowStyle, (x) =>
      oneOf(x, ["filled", "open"] as const, `${path}.arrowStyle`),
    ),
    concurrent: opt(o.concurrent, (x) => bool(x, `${path}.concurrent`)),
    data: o.data,
  };
}
