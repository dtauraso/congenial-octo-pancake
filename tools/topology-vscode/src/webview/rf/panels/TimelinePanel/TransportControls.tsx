// Play / pause transport control.
// Phase 4: replace with Go IPC — call postMessage to the Go runtime.
// Until then the button is inert (no TS substrate driver to call).

export function TransportControls() {
  return (
    <button
      type="button"
      className="timeline-play"
      title="play (Phase 4: Go IPC)"
      disabled
    >
      ▶
    </button>
  );
}
