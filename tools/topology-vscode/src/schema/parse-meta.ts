// Parsers for SeedEvent, LegendRow, Note + the validatePorts pass that
// flags unknown source/target ids and unknown port names.

import { EDGE_KINDS } from "./types";
import type { LegendRow, Note, SeedEvent, Spec } from "./types-graph";
import { NODE_TYPES } from "./node-types";
import {
  num,
  obj,
  oneOf,
  opt,
  ParseError,
  stateValue,
  str,
} from "./parse-primitives";

export function parseSeedEvent(v: unknown, path: string): SeedEvent {
  const o = obj(v, path);
  return {
    nodeId: str(o.nodeId, `${path}.nodeId`),
    outPort: str(o.outPort, `${path}.outPort`),
    value: stateValue(o.value, `${path}.value`),
    atTick: opt(o.atTick, (x) => num(x, `${path}.atTick`)),
  };
}

export function parseLegendRow(v: unknown, path: string): LegendRow {
  const o = obj(v, path);
  return {
    kind: oneOf(o.kind, EDGE_KINDS, `${path}.kind`),
    name: str(o.name, `${path}.name`),
    desc: str(o.desc, `${path}.desc`),
  };
}

export function parseNote(v: unknown, path: string): Note {
  const o = obj(v, path);
  return {
    x: num(o.x, `${path}.x`),
    y: num(o.y, `${path}.y`),
    width: opt(o.width, (x) => num(x, `${path}.width`)),
    height: opt(o.height, (x) => num(x, `${path}.height`)),
    text: str(o.text, `${path}.text`),
  };
}

export function validatePorts(s: Spec): void {
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
