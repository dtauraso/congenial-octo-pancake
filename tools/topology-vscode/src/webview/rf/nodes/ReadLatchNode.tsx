// RF custom node for the "ReadLatch" kind.
// Static visual only: label, two input handles (in, release), one output.
// No simulation, no RAF, no slot phase logic.

import { Handle, Position, type NodeProps } from "reactflow";
import { useFireFlash } from "./use-fire-flash";

interface ReadLatchNodeData {
  label?: string;
  lastFire?: number;
}

export function ReadLatchNode({ data }: NodeProps<ReadLatchNodeData>) {
  const flashing = useFireFlash(data.lastFire);
  return (
    <div style={{ ...styles.container, boxShadow: flashing ? "0 0 8px 2px #00838f" : undefined }}>
      <Handle type="target" position={Position.Left} id="FromIn" style={{ ...styles.handle, top: "30%" }} />
      <Handle type="target" position={Position.Left} id="FromRelease" style={{ ...styles.releaseHandle, top: "70%" }} />
      <div style={styles.label}>{data.label ?? "readlatch"}</div>
      <div style={styles.sublabel}>FromIn / FromRelease</div>
      <Handle type="source" position={Position.Right} id="ToNext" style={styles.handle} />
    </div>
  );
}

const styles = {
  container: {
    background: "#e0f7fa",
    border: "1px solid #00838f",
    borderRadius: 4,
    padding: "6px 10px",
    minWidth: 90,
    fontFamily: "monospace",
    fontSize: 11,
    color: "#006064",
  },
  label: {
    fontWeight: 700,
    color: "#00838f",
    textAlign: "center" as const,
  },
  sublabel: {
    fontSize: 9,
    color: "#8b949e",
    textAlign: "center" as const,
  },
  handle: {
    background: "#00838f",
  },
  releaseHandle: {
    background: "#80cbc4",
  },
} as const;
