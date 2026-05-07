import type React from "react";

// Visible port dot. Sized large enough to be a real drag target, colored by
// the port's edge kind so users can see which kinds connect to which.
export function portStyle(
  side: "left" | "right",
  topPct: number,
  color: string,
): React.CSSProperties {
  return {
    width: 8, height: 8, minWidth: 0, minHeight: 0,
    [side]: -4, top: `${topPct}%`,
    transform: "translate(0, -50%)",
    background: color, border: "1px solid #fff",
    borderRadius: 4,
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