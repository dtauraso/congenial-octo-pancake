// HTML manual-consume affordance.
// Phase 4: replace with Go IPC — wire to real slot-phase signal from Go runtime.
// Until then the button is always disabled (no TS substrate to subscribe to).

export function ManualTakeButton({
  slotId,
}: {
  nodeRef: unknown;
  slotId: string;
  onConsume: () => void;
}) {
  return (
    <button
      type="button"
      disabled
      data-armed="false"
      data-input-id={slotId}
      style={{
        marginLeft: 6,
        padding: "1px 6px",
        fontSize: 11,
        lineHeight: 1.2,
        background: "#fff",
        border: "1px solid #333",
        borderRadius: 3,
        cursor: "default",
        opacity: 0.5,
      }}
    >
      ⌫
    </button>
  );
}
