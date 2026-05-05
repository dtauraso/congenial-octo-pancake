import type { EdgeKind } from "./types";

export const KIND_COLORS: Record<EdgeKind, string> = {
  "chain": "#333",
  "signal": "#7b1fa2",
  "feedback-ack": "#7b1fa2",
  "release": "#00838f",
  "streak": "#2e7d32",
  "pointer": "#e65100",
  "and-out": "#283593",
  "edge-connection": "#2266aa",
  "inhibit-in": "#880e4f",
  "any": "#888",
};
