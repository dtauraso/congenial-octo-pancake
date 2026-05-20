// RF custom node for the "ChainInhibitor" kind.
// Static visual only: label, one input (FromPrev), two outputs (ToEdge, ToNext).
// Shows the "held" slot value statically from node.data if present.
// No simulation, no RAF, no slot phase logic.

import { Handle, Position, type NodeProps } from "reactflow";
import { useFireFlash } from "./use-fire-flash";

interface ChainInhibitorNodeData {
  label?: string;
  nodeData?: { held?: unknown };
  lastFire?: number;
}

export function ChainInhibitorNode({ data }: NodeProps<ChainInhibitorNodeData>) {
  const flashing = useFireFlash(data.lastFire);
  const held = data.nodeData?.held;
  return (
    <div style={{ ...styles.container, boxShadow: flashing ? "0 0 8px 2px #e65100" : undefined }}>
      <Handle type="target" position={Position.Left} id="FromPrev" style={styles.handle} />
      <div style={styles.label}>{data.label ?? "chainInhibitor"}</div>
      {held !== undefined && (
        <div style={styles.held}>held={JSON.stringify(held)}</div>
      )}
      <Handle type="source" position={Position.Right} id="ToEdge" style={{ ...styles.handle, top: "35%" }} />
      <Handle type="source" position={Position.Right} id="ToNext" style={{ ...styles.handle, top: "65%" }} />
    </div>
  );
}

const styles = {
  container: {
    background: "#fff3e0",
    border: "1px solid #e65100",
    borderRadius: 4,
    padding: "6px 10px",
    minWidth: 90,
    fontFamily: "monospace",
    fontSize: 11,
    color: "#bf360c",
  },
  label: {
    fontWeight: 700,
    color: "#e65100",
    textAlign: "center" as const,
  },
  held: {
    fontSize: 9,
    color: "#8b949e",
    textAlign: "center" as const,
    marginTop: 2,
  },
  handle: {
    background: "#e65100",
  },
} as const;
