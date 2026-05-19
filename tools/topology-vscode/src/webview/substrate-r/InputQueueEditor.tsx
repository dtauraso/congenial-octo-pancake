// Ephemeral toggle+field for editing an Input node's initialQueue inline.
// Open/closed state is per-node, stored in React component state (not persisted).
// On commit, writes back to spec.nodes[i].data.init via mutateSpec + scheduleSave.

import { useState, useCallback } from "react";
import type * as React from "react";
import { mutateSpec } from "../state";
import { scheduleSave, flushSave } from "../save";

interface Props {
  nodeId: string;
  initialQueue: unknown[];
  onHeightChange: () => void;
}

export function InputQueueEditor({ nodeId, initialQueue, onHeightChange }: Props) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    setOpen((prev) => !prev);
    requestAnimationFrame(onHeightChange); // vocab-ok: visual layer
  }, [onHeightChange]);

  const queueString = initialQueue.map(String).join("");

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const ints = e.target.value.split("").map(Number).filter((n) => !Number.isNaN(n));
    mutateSpec((s) => {
      const node = s.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      node.data = { ...(node.data as Record<string, unknown> ?? {}), init: ints };
    });
    scheduleSave();
  }, [nodeId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      flushSave();
    }
  }, []);

  const stopProp = useCallback((e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}
      onPointerDown={stopProp}
      onClick={stopProp}
    >
      <button
        onPointerDown={toggle}
        style={{
          fontSize: 9,
          padding: "1px 4px",
          cursor: "pointer",
          background: open ? "#ddeeff" : "#f0f0f0",
          border: "1px solid #aaa",
          borderRadius: 3,
          lineHeight: 1.4,
          userSelect: "none",
        }}
      >
        {open ? "▲ queue" : "▼ queue"}
      </button>
      {open && (
        <input
          type="text"
          defaultValue={queueString}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPointerDown={stopProp}
          onClick={stopProp}
          className="nodrag nopan"
          style={{
            marginTop: 2,
            fontSize: 11,
            width: 70,
            border: "1px solid #aaa",
            borderRadius: 3,
            padding: "1px 3px",
            fontFamily: "monospace",
          }}
        />
      )}
    </div>
  );
}
