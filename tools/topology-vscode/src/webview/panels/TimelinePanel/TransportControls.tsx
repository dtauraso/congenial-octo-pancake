// Play / pause / step against the system 3 frame renderer
// (FrameRendererCtl on the host). The webview owns no substrate
// state — the toggle is optimistic; the host is the source of truth
// for pause/resume.

import { useState } from "react";
import { vscode } from "../../save";

export function TransportControls({ label }: { label: string }) {
  const [paused, setPaused] = useState(false);
  const onPlayPause = () => {
    if (paused) {
      vscode.postMessage({ type: "frame-resume" });
      setPaused(false);
    } else {
      vscode.postMessage({ type: "frame-pause" });
      setPaused(true);
    }
  };
  const onStep = () => {
    vscode.postMessage({ type: "frame-step" });
    setPaused(true);
  };
  return (
    <>
      <button
        type="button"
        className="timeline-play"
        title={paused ? "play" : "pause"}
        onClick={onPlayPause}
      >
        {paused ? "▶" : "⏸"}
      </button>
      <button
        type="button"
        className="timeline-step"
        title="step one event"
        onClick={onStep}
      >
        ⏭
      </button>
      <span className="timeline-time">{label}</span>
    </>
  );
}
