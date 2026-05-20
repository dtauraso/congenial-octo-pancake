// RF custom node for the "input" kind.
// Renders static visual only: label, init-queue display, and one output
// handle. No simulation, no RAF, no slot phase logic.

import { Handle, Position, type NodeProps } from "reactflow";
import { useFireFlash } from "./use-fire-flash";

interface InputNodeData {
  label?: string;
  // Init queue — array of values the Go runtime will emit in order.
  initialQueue?: unknown[];
  repeat?: boolean;
  lastFire?: number;
}

export function InputNode({ data }: NodeProps<InputNodeData>) {
  const flashing = useFireFlash(data.lastFire);
  const queue = data.initialQueue ?? [];
  const queueStr = queue.length > 0
    ? queue.map((v) => JSON.stringify(v)).join(", ")
    : "—";

  return (
    <div style={{ ...styles.container, boxShadow: flashing ? "0 0 8px 2px #3fb950" : undefined }}>
      <div style={styles.label}>{data.label ?? "input"}</div>
      <div style={styles.queue} title="init queue">
        [{queueStr}]
      </div>
      {data.repeat && <div style={styles.repeat}>↺ repeat</div>}
      <Handle
        type="source"
        position={Position.Right}
        id="ToOut"
        style={styles.handle}
      />
    </div>
  );
}

const styles = {
  container: {
    background: "#1a1f2e",
    border: "1px solid #3fb950",
    borderRadius: 4,
    padding: "6px 10px",
    minWidth: 90,
    fontFamily: "monospace",
    fontSize: 11,
    color: "#c9d1d9",
  },
  label: {
    fontWeight: 700,
    marginBottom: 4,
    color: "#3fb950",
  },
  queue: {
    fontSize: 10,
    color: "#8b949e",
    wordBreak: "break-all" as const,
    maxWidth: 160,
  },
  repeat: {
    fontSize: 9,
    color: "#58a6ff",
    marginTop: 2,
  },
  handle: {
    background: "#3fb950",
  },
} as const;
