// Play / pause / step / speed-slider / tick label.

import {
  getTickMs,
  isPlaying,
  pause,
  play,
  setTickMs,
  stepOnce,
} from "../../../sim/runner";
import {
  isSubstrateRunning,
  pauseSubstrate,
  resumeSubstrate,
} from "../../../substrate/runtime";
import {
  isWiresRuntimePaused,
  isWiresRuntimeRunning,
  pauseWiresRuntime,
  resumeWiresRuntime,
} from "../../../substrate/runtime-wires";

export function TransportControls({ label }: { label: string }) {
  // Three runtimes share this button: the wires runtime (matched
  // Input->ReadGate path), the legacy substrate runtime, and the
  // legacy sim runner. Reflect whichever is active.
  const wiresActive = isWiresRuntimeRunning();
  const wiresPaused = isWiresRuntimePaused();
  const substrateActive = isSubstrateRunning();
  const playing = wiresActive
    ? !wiresPaused
    : substrateActive || isPlaying();
  const toggle = () => {
    if (wiresActive) {
      if (wiresPaused) resumeWiresRuntime();
      else pauseWiresRuntime();
      return;
    }
    if (substrateActive) { pauseSubstrate(); return; }
    // Legacy path. Substrate-paused (spec loaded but _running=false)
    // is invisible to isSubstrateRunning, so resumeSubstrate is a
    // no-op when no substrate spec is loaded.
    if (playing) pause(); else { resumeSubstrate(); play(); }
  };
  return (
    <>
      <button
        type="button"
        className="timeline-play"
        title={playing ? "pause" : "play"}
        onClick={toggle}
      >
        {playing ? "⏸" : "▶"}
      </button>
      <button
        type="button"
        className="timeline-step"
        title="step one event"
        onClick={() => { pause(); pauseSubstrate(); pauseWiresRuntime(); stepOnce(); }}
      >
        ⏭
      </button>
      <input
        type="range"
        className="timeline-speed"
        title="tick interval (ms)"
        min={60}
        max={1500}
        step={20}
        defaultValue={getTickMs()}
        onChange={(e) => setTickMs(Number(e.currentTarget.value))}
      />
      <span className="timeline-time">{label}</span>
    </>
  );
}
