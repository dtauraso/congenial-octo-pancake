// Bottom control strip: play/pause + step + speed slider + tick/cycle
// readout + bookmark list + trace load/replay status. Composed from
// TransportControls / TraceStatus / Bookmarks subcomponents in
// TimelinePanel/.

import { useEffect, useState } from "react";
import {
  getWorld,
  isReplaying,
  subscribeState,
} from "../../sim/runner";
import {
  subscribeWires, subscribeTotalTicks, getTotalTicks,
  isWiresRuntimeRunning,
} from "../../substrate/runtime-wires";
import {
  isTickedActive, tickedTickCount, subscribeTicked,
} from "../../substrate/ticked";
import { useTrace, useViewerState } from "../state";
import { Bookmarks } from "./TimelinePanel/Bookmarks";
import { TraceStatus } from "./TimelinePanel/TraceStatus";
import { TransportControls } from "./TimelinePanel/TransportControls";

export {
  handleTraceError,
  handleTraceLoaded,
} from "./TimelinePanel/trace-load";

export function TimelinePanel() {
  const viewer = useViewerState();
  const trace = useTrace();
  const [, force] = useState(0);

  useEffect(() => {
    const unsub = subscribeState(() => force((n) => n + 1));
    return () => { unsub?.(); };
  }, []);

  useEffect(() => {
    const unsub = subscribeWires(() => force((n) => n + 1));
    return () => { unsub?.(); };
  }, []);

  useEffect(() => {
    const unsub = subscribeTotalTicks(() => force((n) => n + 1));
    return () => { unsub?.(); };
  }, []);

  useEffect(() => {
    const unsub = subscribeTicked(() => force((n) => n + 1));
    return () => { unsub?.(); };
  }, []);

  const w = getWorld();
  const replaying = isReplaying();
  const loadedTrace = trace.loaded;
  const wiresRunning = isWiresRuntimeRunning();
  const ticked = isTickedActive();

  const label = replaying && loadedTrace
    ? `replay · ${loadedTrace.length} events`
    : ticked
      ? `tick ${tickedTickCount()}`
      : wiresRunning
        ? `ticks ${getTotalTicks()}`
        : w
          ? `tick ${w.tick} · cycle ${w.cycle} · queued ${w.queue.length}`
          : "—";

  return (
    <div className="timeline-panel" data-undo-scope="viewer">
      <TransportControls label={label} />
      <TraceStatus loadedTrace={loadedTrace} name={trace.name} drift={trace.drift} />
      <Bookmarks
        bookmarks={viewer.bookmarks ?? []}
        selectionIds={viewer.lastSelectionIds}
      />
    </div>
  );
}
