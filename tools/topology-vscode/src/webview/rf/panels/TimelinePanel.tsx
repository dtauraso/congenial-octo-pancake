// Bottom control strip: play/pause/step against the frame renderer.
// Bookmarks, trace-load, and legacy runner readouts retired in step 4
// of the remove-legacy-runtimes deletion sweep.

import { TransportControls } from "./TimelinePanel/TransportControls";

export function TimelinePanel() {
  return (
    <div className="timeline-panel" data-undo-scope="viewer">
      <TransportControls label="—" />
    </div>
  );
}
