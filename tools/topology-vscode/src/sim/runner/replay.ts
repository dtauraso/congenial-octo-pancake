// Trace-replay path: drive the runner from a recorded TraceEvent[]
// instead of running the live simulator.
//   recv → re-run the receiving node's handler so world.state stays in
//          sync (Phase 6 motion reads world.state.dx/dy); emit FireEvent
//   send → emit EmitEvent on the named edge
//   fire → no-op (the FireEvent already fired on recv)

import { NODE_TYPES } from "../../schema";
import { getHandler } from "../handlers";
import { notify } from "../event-bus";
import type { TraceEvent } from "../trace";
import { state, liveSimTime, findEdge } from "./_state";
import { pause } from "./playback";
import { notifyState } from "../event-bus";

export function replayStepOnce(): void {
  if (!state.spec || !state.world || !state.replayEvents) return;
  if (state.replayIndex >= state.replayEvents.length) {
    pause();
    notifyState();
    return;
  }
  const ev = state.replayEvents[state.replayIndex++];
  state.stepSimTime = liveSimTime();
  try {
    replayDispatch(ev);
  } finally {
    state.stepSimTime = null;
  }
  notifyState();
}

function replayDispatch(ev: TraceEvent): void {
  if (!state.spec || !state.world) return;
  if (ev.kind === "recv") {
    const node = state.spec.nodes.find((n) => n.id === ev.node);
    const handler = node ? getHandler(node.type, ev.port) : undefined;
    if (handler && node) {
      const prev = state.world.state[ev.node] ?? {};
      const def = NODE_TYPES[node.type];
      const props = { ...(def?.defaultProps ?? {}), ...(node.props ?? {}) };
      const result = handler(prev, { port: ev.port, value: ev.value }, props);
      state.world.state = { ...state.world.state, [ev.node]: result.state };
    }
    notify({
      type: "fire",
      nodeId: ev.node,
      inputPort: ev.port,
      inputValue: ev.value,
      tick: state.world.tick,
      ord: state.replayIndex,
    });
  } else if (ev.kind === "send") {
    const edge = findEdge(state.spec, ev.edge);
    if (edge) {
      notify({
        type: "emit",
        edgeId: edge.id,
        fromNodeId: edge.source,
        toNodeId: edge.target,
        value: ev.value,
        tick: state.world.tick,
      });
    }
  }
}
