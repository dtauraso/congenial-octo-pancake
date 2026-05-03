import { svg } from "lit-html";
import { KIND_COLORS, type Edge } from "../schema";

const ARROW_FILLED_KINDS: Array<keyof typeof KIND_COLORS> = [
  "chain", "signal", "feedback-ack", "release", "streak", "pointer", "and-out", "inhibit-in", "any",
];

export function markerId(kind: string, open: boolean): string {
  const safe = kind.replace(/[^a-z0-9]/gi, "-");
  return `arrow-${safe}${open ? "-open" : ""}`;
}

export function markerForEdge(e: Edge): string {
  const open = e.arrowStyle === "open" || e.kind === "edge-connection";
  return open ? markerId("edge-connection", true) : markerId(e.kind, false);
}

const filledMarker = (kind: keyof typeof KIND_COLORS) => svg`
  <marker id=${markerId(kind, false)} markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
    <path d="M0,0 L8,3 L0,6 Z" fill=${KIND_COLORS[kind]}/>
  </marker>`;

const openMarker = svg`
  <marker id=${markerId("edge-connection", true)} markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto">
    <path d="M0,0 L10,4 L0,8" fill="none" stroke=${KIND_COLORS["edge-connection"]} stroke-width="1.2"/>
  </marker>`;

export const defsTemplate = svg`
  <defs>
    ${ARROW_FILLED_KINDS.map(filledMarker)}
    ${openMarker}
  </defs>`;
