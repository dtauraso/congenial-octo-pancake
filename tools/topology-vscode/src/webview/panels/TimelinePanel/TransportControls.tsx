// Play / pause against the in-webview substrate driver.
// Reads halted state and calls halt/resume directly via the
// SubstrateProvider context — no postMessage.

import { useRegistry } from "../../substrate-r/registry";

export function TransportControls({ label }: { label: string }) {
  const { driver } = useRegistry();
  const paused = driver.halted;
  const onPlayPause = () => {
    if (paused) driver.resume();
    else driver.halt();
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
      <span className="timeline-time">{label}</span>
    </>
  );
}
