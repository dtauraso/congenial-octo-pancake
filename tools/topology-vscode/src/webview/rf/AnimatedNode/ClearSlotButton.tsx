import { vscode } from "../../save";
import type { AnimatedNodeData } from "./_types";

// Editor escape hatch for the manual step-debug workflow: clicking
// this button posts a clear-slot message to the extension, which
// looks up the wire feeding `{nodeId}.{port}` and calls
// `Wire.clear()` on it. Currently only rendered for ReadGate
// (one input, chainIn). The button is a deliberate break from the
// loaded -> taken -> empty sequence; only the editor calls it.
export function ClearSlotButton({
  nodeId,
  data,
}: {
  nodeId: string;
  data: AnimatedNodeData;
}) {
  if (data.type !== "ReadGate") return null;
  return (
    <button
      className="node-clear-slot-btn"
      title="clear in0 pulse slot"
      onClick={(e) => {
        e.stopPropagation();
        vscode.postMessage({ type: "clear-slot", nodeId, port: "chainIn" });
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
        cursor: "pointer",
        zIndex: 2,
      }}
    >
      ⌫
    </button>
  );
}
