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

export function TransportControls({ label }: { label: string }) {
  // When the substrate path owns the topology, the legacy runner is
  // reset and isPlaying() is false. Reflect substrate state on the
  // button so the toggle controls whichever runtime is active.
  const substrateActive = isSubstrateRunning();
  const playing = substrateActive || isPlaying();
  const toggle = () => {
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
        onClick={() => { pause(); pauseSubstrate(); stepOnce(); }}
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
