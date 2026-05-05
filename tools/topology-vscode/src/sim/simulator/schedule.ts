import type { Spec, StateValue } from "../../schema";
import { NODE_TYPES } from "../../schema";
import { readEdgeDelay, readEdgeSlots } from "../seeds";
import { ensureReleaseEntry } from "../slot-release";
import { type EdgeIndex, type SimEvent, type World, edgeKey } from "./types";

// Resolve per-instance props by merging registry defaults under overrides.
export function resolveProps(spec: Spec, nodeId: string): Record<string, StateValue> {
  const node = spec.nodes.find((n) => n.id === nodeId);
  if (!node) return {};
  const def = NODE_TYPES[node.type];
  return { ...(def?.defaultProps ?? {}), ...(node.props ?? {}) };
}

// Emit one (sourceNode, sourcePort, value) onto every outgoing edge,
// scheduled at `baseTick + delay`. Edge picks its delay: `data.delay`
// override else `defaultDelay`. No edges → silently dropped (modeling Go's
// dead-end channels like ToAck on terminal inhibitors).
export function scheduleEmission(
  world: World,
  idx: EdgeIndex,
  fromNodeId: string,
  fromPort: string,
  value: StateValue,
  baseTick: number,
  defaultDelay: number,
): void {
  const edges = idx.get(edgeKey(fromNodeId, fromPort)) ?? [];
  for (const e of edges) {
    const d = readEdgeDelay(e.data) ?? defaultDelay;
    const slots = readEdgeSlots(e.data);
    const ev: SimEvent = {
      id: world.nextId++,
      readyAt: baseTick + d,
      edgeId: e.id,
      fromNodeId,
      fromPort,
      toNodeId: e.target,
      toPort: e.targetHandle,
      value,
    };
    if ((world.edgeOccupancy[e.id] ?? 0) >= slots) {
      const arr = world.edgePending[e.id] ?? [];
      arr.push(ev);
      world.edgePending[e.id] = arr;
    } else {
      world.queue.push(ev);
      world.edgeOccupancy[e.id] = (world.edgeOccupancy[e.id] ?? 0) + 1;
      if (world.deferSlotFreeToView) ensureReleaseEntry(world, e.id);
    }
  }
}
