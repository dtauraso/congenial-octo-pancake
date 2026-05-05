// Ghost-node + class-merging primitives shared by compare and onion
// decorators.

import type { Node as RFNode } from "reactflow";
import { NODE_TYPES, type Node as SpecNode } from "../../../schema";

export const GHOST_PREFIX = "__ghost__";
export const CONNECTOR_PREFIX = "__moved_connector__";

export function ghostNode(n: SpecNode, extraClass: string): RFNode {
  const def = NODE_TYPES[n.type];
  return {
    id: `${GHOST_PREFIX}${n.id}`,
    type: "animated",
    position: { x: n.x, y: n.y },
    selectable: false,
    draggable: false,
    focusable: false,
    className: `ghost ${extraClass}`.trim(),
    data: {
      label: n.id,
      sublabel: n.sublabel,
      type: n.type,
      fill: def?.fill ?? "#ffffff",
      stroke: def?.stroke ?? "#888",
      shape: def?.shape ?? "rect",
      width: def?.width ?? 110,
      height: def?.height ?? 60,
      inputs: def?.inputs ?? [],
      outputs: def?.outputs ?? [],
    },
  };
}

export function appendClass(existing: string | undefined, extra: string): string {
  return existing ? `${existing} ${extra}` : extra;
}
