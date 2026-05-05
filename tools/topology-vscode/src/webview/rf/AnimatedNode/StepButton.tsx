import { stepToNode } from "../../../sim/runner";

// Per-node step affordance (N2). Visible only when the node is selected so it
// doesn't clutter the unfocused canvas. Click drives the simulator forward
// until the next event delivered to this node; useful for "show me what
// happens next *here*" without globally playing/pausing.
export function StepButton({ id, stroke }: { id: string; stroke: string }) {
  return (
    <button
      className="node-step-btn"
      title={`Step until next fire at ${id} (stops on first arrival; in concurrent topologies this may be mid-cycle)`}
      onClick={(e) => {
        e.stopPropagation();
        stepToNode(id);
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
        border: `1px solid ${stroke}`,
        background: "#fff",
        cursor: "pointer",
        zIndex: 2,
      }}
    >
      ⏭
    </button>
  );
}
