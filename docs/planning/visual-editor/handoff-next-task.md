# Next task: port `<Node>` bodies for remaining node types

**Branch:** after merging `task/edge-visual-fidelity`, friction-driven.
Open a fresh `task/<short-kebab>` only when a real session surfaces
a specific node type as inert.

## State at handoff (2026-05-11, end of session)

Edge visual fidelity is restored on `task/edge-visual-fidelity`:
kind colors, dashes, arrow markers, route variants
(line/snake/below), and edge labels are wired through
`RSubstrateEdge` → `<Wire>`. New files:
`src/webview/substrate-r/edge-path.ts`,
`src/webview/substrate-r/EdgeLabels.tsx`. `Wire` now self-measures
arc length when no explicit `arcLength` is passed, and accepts
`markerEnd` + `strokeDasharray` props.

Gates at commit: tsc ✓, build ✓, vitest 114/114 ✓, LOC ✓.

## Owed

1. **Other node types' substrate behavior.** Today only Input and
   ReadGate have `node-kinds.tsx` entries. ChainInhibitor, AndGate,
   Partition, EdgeNode, etc. mount with no `<Node>` body — fine for
   the user's current working topology but anything that uses them
   will be inert. Friction-driven posture: port each type only
   when it surfaces in a real session.

## ALWAYS clause

(See handoff.md — same clause applies.)
