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

  const w = getWorld();
  const replaying = isReplaying();
  const loadedTrace = trace.loaded;

  const label = replaying && loadedTrace
    ? `replay · ${loadedTrace.length} events`
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
