// Barrel export for the schema module. The original 438-LOC schema.ts
// was split into schema/{types,types-graph,colors,node-types,
// parse-primitives,parse-nodes-edges,parse-meta,parse-spec}.ts. This
// file preserves the existing `from "../schema"` import surface so
// callers don't need to update.

export * from "./schema/types";
export * from "./schema/types-graph";
export { KIND_COLORS } from "./schema/colors";
export { NODE_TYPES } from "./schema/node-types";
export { parseSpec } from "./schema/parse-spec";
