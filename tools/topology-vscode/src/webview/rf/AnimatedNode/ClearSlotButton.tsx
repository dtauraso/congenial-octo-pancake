import { useSyncExternalStore } from "react";
import { vscode } from "../../save";
import { useStore } from "../../state/store";
import { subscribeFrame, getFrameSnapshot } from "../../frame-store";
import type { AnimatedNodeData } from "./_types";

// Editor escape hatch for the manual step-debug workflow: clicking
// this button posts a clear-slot message to the extension, which
// looks up the wire feeding `{nodeId}.{port}` and calls
// `Wire.clear()` on it. Currently only rendered for ReadGate
// (one input, chainIn). The button is a deliberate break from the
// loaded -> taken -> empty sequence; only the editor calls it.
//
// Gated on slot phase: disabled while the slot is empty so clicks
// can't accumulate on a not-yet-loaded slot (the source decides when
// the first pulse arrives — see feedback_clear_button_armed_only_when_loaded).
export function ClearSlotButton({
  nodeId,
  data,
}: {
  nodeId: string;
  data: AnimatedNodeData;
}) {
  if (data.type !== "ReadGate") return null;
  const port = "chainIn";
  const wireId = useStore((s) =>
    s.spec.edges.find((e) => e.target === nodeId && e.targetHandle === port)?.id,
  );
  const frame = useSyncExternalStore(subscribeFrame, getFrameSnapshot, getFrameSnapshot);
  const phase = wireId ? frame.wires.get(wireId)?.kind ?? "empty" : "empty";
  const armed = phase === "loaded";

  return (
    <button
      className="node-clear-slot-btn"
      title={armed ? "clear in0 pulse slot" : "slot empty — wait for pulse"}
      disabled={!armed}
      onClick={(e) => {
        e.stopPropagation();
        if (!armed) return;
        vscode.postMessage({ type: "clear-slot", nodeId, port });
      }}
      style={{
        position: "absolute",
        top: -10,
        left: -10,
        width: 18,
        height: 18,
        padding: 0,
        fontSize: 10,
        lineHeight: "18px",
        textAlign: "center",
        borderRadius: 9,
        border: `1px solid ${data.stroke}`,
        background: "#fff",
        color: data.stroke,
        cursor: armed ? "pointer" : "not-allowed",
        opacity: armed ? 1 : 0.4,
        zIndex: 2,
      }}
    >
      ⌫
    </button>
  );
}
