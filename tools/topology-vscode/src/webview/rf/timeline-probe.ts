// Unified timeline probe. Captures every emit, fire, animation
// start/end, and play-state change with sim+wall timestamps. The
// original 280-LOC module split into timeline-probe/{types,
// ring-buffer,anim-events,notes,install}.ts. Importing this file
// triggers the install side effect (window globals + runner
// subscriptions + heartbeat).

import "./timeline-probe/install";

export type {
  AnimEvent,
  AnimListener,
  TimelineEntry,
} from "./timeline-probe/types";
export { subscribeAnim } from "./timeline-probe/anim-events";
export {
  noteAnimEnd,
  noteAnimRerun,
  noteAnimStart,
  noteMarker,
} from "./timeline-probe/notes";
