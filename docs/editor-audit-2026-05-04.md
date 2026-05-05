# Editor core/plugin boundary audit — 2026-05-04

Inventory of `tools/topology-vscode/src/` against the framing in
[editor-architecture.md](editor-architecture.md). No refactor — just
where wirefold-specific code currently lives so future work can
extract it incrementally.

## Classification

| File | Class | Leaks (file:line + note) |
|------|-------|---------------------------|
| `../tools/topology-vscode/src/schema.ts` | PLUGIN | L4–14, L131–242: `NODE_TYPES` registry hardcodes all 12 wirefold node types (ReadLatch, ChainInhibitor, StreakDetector, SyncGate, ReadGate, AndGate, EdgeNode, Partition, …). L154–240: `role` strings are wirefold domain concepts. Port kinds (`feedback-ack`, `edge-connection`, `inhibit-in`, `and-out`) are wirefold-specific. L245–255: `KIND_COLORS` maps wirefold edge semantics to colors. |
| `../tools/topology-vscode/src/sim/handlers.ts` | PLUGIN | L22–30: `__has_${port}` buffer pattern. L40–51: ChainInhibitor handler (`inhibitOut`/`readNew`/`held`). L76–85: ReadGate/SyncGate/AndGate join logic with wirefold port names. L87–105: EdgeNode XOR contrast detector. L127–158: StreakBreak/Streak detectors. L160–195: Partition state machine. L199–241: `HANDLERS`, `GATE_TYPES`, `MOTION_TYPES` enumerate wirefold types. |
| `../tools/topology-vscode/src/sim/simulator.ts` | CORE | Pure event-stepping; calls `getHandler()` and `NODE_TYPES` generically (L251–254). |
| `../tools/topology-vscode/src/sim/runner.ts` | CORE | Wall-clock runner; publishes FireEvent/EmitEvent renderer-agnostically. |
| `../tools/topology-vscode/src/sim/concurrency.ts` | CORE | BFS reachability classifier. Reads `GATE_TYPES` from handlers but algorithm is generic. |
| `../tools/topology-vscode/src/sim/drift.ts` | CORE | Trace projection comparison. No domain knowledge. |
| `../tools/topology-vscode/src/webview/rf/AnimatedNode.tsx` | CORE | Generic animated node. L70, L117–120 read `state.held` generically; no node-type switch. |
| `../tools/topology-vscode/src/webview/rf/NodePalette.tsx` | CORE | Iterates `NODE_TYPES` generically. |
| `../tools/topology-vscode/src/webview/rf/adapter.ts` | CORE | Spec↔flow conversion via `NODE_TYPES[n.type]`. |
| `../tools/topology-vscode/src/webview/rf/AnimatedEdge.tsx` | CORE | Generic animated edge. |
| `../tools/topology-vscode/src/webview/rf/app.tsx` | MIXED | L76–79: `EDGE_KIND_OPTIONS` hardcodes wirefold edge kinds. Should derive from `KIND_COLORS` / plugin. |
| `../tools/topology-vscode/src/webview/rf/edge-style.ts` | CORE | |
| `../tools/topology-vscode/src/webview/state.ts` | CORE | Zustand store; generic graph state. |
| `../tools/topology-vscode/src/webview/save.ts` | CORE | Debounce/flush. |
| `../tools/topology-vscode/src/webview/delete-core.ts` | CORE | Generic mutation. |
| `../tools/topology-vscode/src/webview/rename-core.ts` | CORE | Generic rename. |
| `../tools/topology-vscode/src/webview/fold-core.ts` | CORE | Generic grouping. |
| `../tools/topology-vscode/src/webview/inline-edit.ts` | CORE | Generic text editing affordance. |
| `../tools/topology-vscode/src/webview/rf/diff-decorate.ts` | CORE | Comparison decoration. |
| `../tools/topology-vscode/src/extension.ts` | MIXED | Webview glue; touches `runCommand`/`topogenRunner` (Go-specific). |
| `../tools/topology-vscode/src/topogenRunner.ts` | PLUGIN | Wirefold codegen / Go topogen runner. |
| `../tools/topology-vscode/src/runCommand.ts` | PLUGIN | Invokes wirefold build/run; targets Go. |
| `../tools/topology-vscode/src/compareLoader.ts` | MIXED | Comparison loader; not fully audited. |

## Biggest extraction opportunities (deferred)

1. **`NODE_TYPES` registry** ([schema.ts:131-242](../tools/topology-vscode/src/schema.ts#L131-L242)) — pure wirefold domain data. Move to a plugin manifest injected at load time. Shrinks `schema.ts` from ~407 → ~150 lines.
2. **`handlers.ts`** — entire file is wirefold handlers. Core only needs the `HandlerFn` type and a registry hook; handlers move to a wirefold plugin package.
3. **Edge kinds + `KIND_COLORS`** ([schema.ts:4-14](../tools/topology-vscode/src/schema.ts#L4-L14)) — 10 wirefold-specific kinds. Plugin or domain config.
4. **`GATE_TYPES` / `MOTION_TYPES`** ([handlers.ts:226-241](../tools/topology-vscode/src/sim/handlers.ts#L226-L241)) — should derive from plugin handler metadata, not core enumeration.
5. **`EDGE_KIND_OPTIONS`** ([app.tsx:76-79](../tools/topology-vscode/src/webview/rf/app.tsx#L76-L79)) — duplicate of edge kind enum; single source of truth needed.
6. **`runCommand.ts` / `topogenRunner.ts`** — Go-specific build/run. Becomes one of N pluggable export targets.

## Reassuring findings

- The simulator, runner, concurrency classifier, and drift comparator are **already core-clean**: they delegate domain semantics through the handler registry and don't switch on node-type names.
- Rendering (AnimatedNode, AnimatedEdge, NodePalette, adapter) is **already core-clean**: visual props come from `NODE_TYPES[type]` lookup; no per-type branches.
- Most webview utilities (state, save, delete, rename, fold, inline-edit) are domain-agnostic.

The leaks are concentrated in two places: `schema.ts` (the registry) and `handlers.ts` (the semantics). That's the cleanest possible shape — when extraction happens, it's two files moving to a plugin, not a sprawling refactor across the codebase.

## Next-feature implication

`task/node-inline-spec` (per-node `data.spec` text + inline display) is **pure core**: any graph editor wants per-node free-form text. No plugin work needed. Safe to build directly against the editor core without waiting for the registry/handlers extraction.
