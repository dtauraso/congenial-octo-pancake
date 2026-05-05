// Play / pause / step / speed-slider / tick label.

import {
  getTickMs,
  isPlaying,
  pause,
  play,
  setTickMs,
  stepOnce,
} from "../../../sim/runner";

export function TransportControls({ label }: { label: string }) {
  const playing = isPlaying();
  return (
    <>
      <button
        type="button"
        className="timeline-play"
        title={playing ? "pause" : "play"}
        onClick={() => (playing ? pause() : play())}
      >
        {playing ? "⏸" : "▶"}
      </button>
      <button
        type="button"
        className="timeline-step"
        title="step one event"
        onClick={() => { pause(); stepOnce(); }}
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
