import type { NodeSpec, Port, StateValue } from "../../../schema";

export type AnimatedNodeData = {
  label: string;
  sublabel?: string;
  type: string;
  fill: string;
  stroke: string;
  shape: "rect" | "pill";
  width: number;
  height: number;
  inputs: Port[];
  outputs: Port[];
  state?: Record<string, StateValue>;
  spec?: NodeSpec;
  notes?: string;
};
