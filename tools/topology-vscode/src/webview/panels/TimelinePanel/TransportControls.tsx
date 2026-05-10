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
import { isTickedActive, tickedStep } from "../../../substrate/ticked";
import { vscode } from "../../save";

let _frameRendererPaused = false;

export function TransportControls({ label }: { label: string }) {
  // Three runtimes share this button: the wires runtime (matched
  // Input->ReadGate path), the legacy substrate runtime, and the
  // legacy sim runner. Reflect whichever is active.
  const ticked = isTickedActive();
  const wiresActive = isWiresRuntimeRunning();
  const wiresPaused = isWiresRuntimePaused();
  const substrateActive = isSubstrateRunning();
  // Ticked substrate is always paused-by-default (no Resume; phase 2).
  const playing = ticked
    ? false
    : wiresActive
      ? !wiresPaused
      : substrateActive || isPlaying();
  const toggle = () => {
    if (_frameRendererPaused) {
      vscode.postMessage({ type: "frame-resume" });
      _frameRendererPaused = false;
    } else {
      vscode.postMessage({ type: "frame-pause" });
      _frameRendererPaused = true;
    }
    if (ticked) return;
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
  const onStep = () => {
    if (ticked) { tickedStep(); return; }
    pause(); pauseSubstrate(); pauseWiresRuntime(); stepOnce();
  };
  return (
    <>
      <button
        type="button"
        className="timeline-play"
        title={ticked ? "ticked: step-only" : (playing ? "pause" : "play")}
        onClick={toggle}
        disabled={ticked}
      >
        {playing ? "⏸" : "▶"}
      </button>
      <button
        type="button"
        className="timeline-step"
        title={ticked ? "step one tick" : "step one event"}
        onClick={onStep}
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
