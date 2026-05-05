import type React from "react";

// Visible port dot. Sized large enough to be a real drag target, colored by
// the port's edge kind so users can see which kinds connect to which.
export function portStyle(
  side: "left" | "right",
  topPct: number,
  color: string,
  buffered = false,
): React.CSSProperties {
  return {
    width: 8, height: 8, minWidth: 0, minHeight: 0,
    [side]: -4, top: `${topPct}%`,
    transform: "translate(0, -50%)",
    background: color, border: "1px solid #fff",
    borderRadius: 4,
    // Halo ring marks an input that has buffered a value and is waiting
    // for its peer (AND-style joins). Distinct from the fire/glow pulse —
    // halo is the idle "input X waiting" indicator (audit row #4).
    ...(buffered ? { boxShadow: `0 0 0 2px ${color}` } : {}),
  };
}

export const HANDLE_STYLE_LEFT: React.CSSProperties = {
  width: 1, height: 1, minWidth: 0, minHeight: 0,
  left: 0, top: "50%",
  transform: "translate(0, -50%)",
  background: "transparent", border: "none", pointerEvents: "none",
};
export const HANDLE_STYLE_RIGHT: React.CSSProperties = {
  width: 1, height: 1, minWidth: 0, minHeight: 0,
  right: 0, top: "50%",
  transform: "translate(0, -50%)",
  background: "transparent", border: "none", pointerEvents: "none",
};

export const FLASH_DURATION_MS = 300;
