// Wall-clock runner around the pure simulator. Owns one World, advances
// it on a setInterval, and publishes events to a typed EventBus that
// AnimatedNode / AnimatedEdge subscribe to. Replaces the old
// `playback.ts` master clock — there is no global `t` anymore; visible
// animation is the side-effect of simulator events firing.

export {
  subscribe,
  subscribeState,
  type FireEvent,
  type EmitEvent,
  type RunnerEvent,
  type RunnerListener,
} from "./event-bus";
export { reportRunnerError } from "./error-probe";

export { getSimTime } from "./runner/_state";
export {
  getTickMs,
  setTickMs,
  load,
  loadTrace,
  isReplaying,
  getConcurrentEdges,
  reset,
  getWorld,
} from "./runner/load";
export { play, pause, isPlaying } from "./runner/playback";
export { stepOnce, stepToNode, jumpTo } from "./runner/step";
export { noteEdgePulseStarted, noteEdgePulseEnded } from "./runner/edge-anim";
export {
  ruleForNodeType, ruleForNodeId, effectiveSpeedPxPerMs,
  type NodeAnimationRule,
} from "./runner/node-animation-rules";
export { signalRendererComplete, extendPulse } from "./runner/pulse-completion";
export { signalPulseComplete } from "./runner/emit";
export { tryClaimVisualSlot, releaseVisualSlot } from "./runner/pulse-concurrency";
