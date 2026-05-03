import type { Node, Spec } from "../schema";
import { DEFAULT_VIEWER_STATE, type ViewerState } from "./viewerState";

export const SVG_NS = "http://www.w3.org/2000/svg";

export let spec: Spec = { nodes: [], edges: [] };
export function setSpec(next: Spec) {
  spec = next;
}

export let svg: SVGSVGElement;
export let staticRoot: SVGGElement;
export let animationLayer: SVGGElement;

export function setLayers(layers: {
  svg: SVGSVGElement;
  staticRoot: SVGGElement;
  animationLayer: SVGGElement;
}) {
  svg = layers.svg;
  staticRoot = layers.staticRoot;
  animationLayer = layers.animationLayer;
}

export const view = { x: 0, y: 0, w: 1380, h: 740 };

export let viewerState: ViewerState = { ...DEFAULT_VIEWER_STATE };
export function setViewerState(next: ViewerState) {
  viewerState = next;
}

export const nodeById = new Map<string, Node>();
