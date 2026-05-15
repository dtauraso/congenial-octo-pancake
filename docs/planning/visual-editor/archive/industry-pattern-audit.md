# Industry-pattern audit — VS Code plugin code

Date: 2026-05-03. Scope: `tools/topology-vscode/src/`. Stack: React 19,
react-flow ^11.11.4, lit-html, TypeScript, esbuild.

This is a **spec for a future chat session** to migrate hand-rolled
code to canonical library/framework primitives. It is *not* a phase
plan — pick items off as friction warrants per the post-v0 posture.

Two prior context docs apply:
- [memory/project_industry_pattern_deferrals.md](../../../memory/project_industry_pattern_deferrals.md) — UX-feature gaps (copy/paste, edge labels, auto-routing, etc.). Different axis: *missing user features*.
- This file — *implementation patterns* where in-house code duplicates what a library already does.

The four shipped quick wins (MiniMap, f/shift+f fit keys, rounded
corners, reject flash) are **placeholders, not load-bearing** — see
the deferrals memo. Items below that subsume them are marked
`[subsumes quick-win]`.

---

## Reimplemented — replace with canonical primitive

Effort tags: XS < 30min, S ~1h, M ~half-day, L ~day+.

### State / store

- **R1 (M).** Module-level `viewerState` and dual snapshot stacks in
  [src/webview/state.ts:29-82](../../../tools/topology-vscode/src/webview/state.ts) → **zustand + immer middleware**. Unlocks devtools time-travel, eliminates module-init order coupling, replaces `structuredClone` + manual mutation with draft semantics. Also subsumes R12.
- **R2 (S).** `lastScopeRef` in [src/webview/rf/app.tsx:154-165](../../../tools/topology-vscode/src/webview/rf/app.tsx) routes Cmd-Z between spec/viewer stacks via mousedown ref → make explicit state in the zustand store from R1.
- **R3 (S).** `selectedRef` synced manually against both `viewerState.lastSelectionIds` and incoming RF selection ([app.tsx:319-331, 371-385](../../../tools/topology-vscode/src/webview/rf/app.tsx)) → derive from react-flow's `useOnSelectionChange` (already imported at line 427); drop the duplicate ref.

### DOM-imperative panels → React

- **R4 (M).** Three panels built with `document.createElement` + manual listeners + `style.display` toggling — `src/webview/views.ts:16-64`, `src/webview/timeline.ts:48-100`, `src/webview/run.ts:12-47` (files removed post-React migration) → migrate into React components inside the webview tree. Eliminates ~200 LOC of imperative glue and the bridge in R5.
- **R5 (S).** `bridge.ts` shim (removed post-React migration) that registers handlers so the imperative panels can call into React Flow → delete once R4 lands; consume via Context/zustand instead.
- **R6 (M).** Contenteditable inline editors duplicated across `src/webview/rename.ts:19-65` and `src/webview/sublabel.ts:16-61` (files removed post-React migration; logic now in rename-core.ts/inline-edit.ts) → one React component using a headless inline-edit hook (e.g. `react-contenteditable`) or floating-ui popover. Centralizes Range/Selection boilerplate (R7).
- **R7 (XS).** Dup'd `Range` + `Selection` "select all text" boilerplate at rename.ts:27-31 and sublabel.ts:27-31 → folded into R6.

### DOM-imperative effects in React tree

- **R8 (S) `[subsumes quick-win]`.** `flashRejectedHandle()` at [src/webview/rf/app.tsx:75-86](../../../tools/topology-vscode/src/webview/rf/app.tsx) — querySelector + class toggle + forced reflow + setTimeout → React state + CSS animation, OR (better) prevent invalid edges entirely via R-M1 (`isValidConnection`) so the flash is unnecessary.
- **R9 (S) `[subsumes quick-win]`.** Hardcoded `f` / `shift+f` / Cmd-Z / Cmd-Y in `onFitKey` and `onKey` ([app.tsx:243-267](../../../tools/topology-vscode/src/webview/rf/app.tsx)) → `react-hotkeys-hook` keybinding registry. Cross-platform modifier handling (R10) folds in.
- **R10 (XS).** Scattered `(e.metaKey || e.ctrlKey)` checks → folded into R9's hotkey lib (handles platform).
- **R11 (XS).** Spacebar hold-to-swap z-order at [app.tsx:113-135](../../../tools/topology-vscode/src/webview/rf/app.tsx) → `react-use` `useKeyPress` or fold into R9.
- **R12 (XS).** `visibilitychange` listener calling `flushSave/flushViewSave` at [src/webview/save.ts:81-82](../../../tools/topology-vscode/src/webview/save.ts) → `react-use` `useBeforeUnload` / `useEvent`.
- **R13 (XS).** Manual `setTimeout` debounce in [save.ts:55-74](../../../tools/topology-vscode/src/webview/save.ts) → `use-debounce` or `lodash.debounce` (cancellable, has flush).

### Geometry / animation math

- **R14 (M) `[subsumes quick-win]`.** Hand-rolled lane assignment + max-bottom traversal + SVG path string building for `feedback-ack` and `inhibit-in` edges in [src/webview/geom.ts:22-46](../../../tools/topology-vscode/src/webview/geom.ts), plus rounded-corner branch in [src/webview/rf/AnimatedEdge.tsx](../../../tools/topology-vscode/src/webview/rf/AnimatedEdge.tsx) → **elkjs** or `libavoid-js` for routing (also covers the deferred "auto-routing with obstacle avoidance" item). The rounded-corner placeholder gets deleted, not extended.
- **R15 (L).** Custom cubic Bézier control-point math + Newton inversion in [AnimatedEdge.tsx:74-125](../../../tools/topology-vscode/src/webview/rf/AnimatedEdge.tsx) used to position riding labels along the edge → switch label animation to SVG `<animateMotion>` with `mpath`, OR use `path.getPointAtLength` (native) directly each frame. Eliminates Newton iteration entirely. Likely blocked by R14 — do after routing is library-driven.
- **R16 (S).** `queryTangent()` finite-difference / analytic tangent in [AnimatedEdge.tsx:207-244](../../../tools/topology-vscode/src/webview/rf/AnimatedEdge.tsx) → `bezier-js` library functions. Lower priority; fold into R15.
- **R17 (S).** Pre-sampled WAAPI keyframes in `riding-keyframes.ts` (file removed post-refactor) → animate a single `offsetDistance` value with WAAPI; query position on-frame via `path.getPointAtLength`. Drops the keyframe queue entirely.
- **R18 (M).** Pulse queue manipulation in [AnimatedEdge.tsx:506-527](../../../tools/topology-vscode/src/webview/rf/AnimatedEdge.tsx) (`pulses` state + `advanceQueue` slice) → `framer-motion` `AnimatePresence` for declarative enter/exit lifecycle.

### Alignment-guide math (note re: deferrals)

- **R19 (S).** O(n) per-frame center-alignment scan in `onNodeDrag` at [app.tsx:714-740](../../../tools/topology-vscode/src/webview/rf/app.tsx) (ALIGN_TOL = 4px) → look for a react-flow alignment-guide plugin; if none, leave it. The deferred "snap to other nodes' edges" and "multi-node alignment guides" items would extend this code, so coordinate.

---

## Missing — features react-flow / ecosystem give for free

- **M1.** `isValidConnection` prop on `<ReactFlow>` (or in `useConnection`) — pre-validates a drag before `onConnect` fires. Currently invalid drops happen, then we flash a reject. **Subsumes the reject-flash quick win** entirely if added: no flash needed because the connection never starts. Pair with R8.
- **M2.** `<Controls />` from react-flow (`@reactflow/controls`, already a transitive dep) — standard zoom / fit / lock buttons. The deferred `f`/`shift+f` keybindings stay; this adds discoverability.
- **M3.** Edge label rendering via react-flow's built-in `label` prop / `EdgeLabelRenderer` instead of hand-placed `<text>` in `AnimatedEdge`. Required to ship the deferred *edge display labels* item cleanly.
- **M4.** `<NodeResizer />` from `@reactflow/node-resizer` — drag handles on node corners; persist size to `spec.props`. Only worth it once node sizing becomes friction.
- **M5.** React Error Boundary around the react-flow canvas — currently a render crash blanks the pane. XS effort, high robustness payoff.
- **M6.** `floating-ui` for the edge context menu at [app.tsx:969](../../../tools/topology-vscode/src/webview/rf/app.tsx) (currently fixed `{x, y}` + zIndex) — auto viewport-edge avoidance, scroll-aware. S effort.
- **M7.** Headless UI / Radix Dialog for fold-name and view-name modal inputs — focus trap, Escape closes, a11y. Pairs with `react-hook-form` for validation.

---

## Out of scope (explicitly not flagging)

The agent surfaced these; ignoring per CLAUDE.md "don't design for
hypothetical future requirements":

- Yjs / Automerge (no multi-user requirement)
- Storybook (single-app, no design-system surface)
- web-vitals / Mixpanel / Segment (no telemetry program)
- React Query for sidecar IPC (single-shot loads, no cache need)
- Mobile responsive layout (VS Code desktop only)

---

## How to drive the follow-up session

1. Pick one cluster (state, panels, geometry, or DOM-imperative) — don't mix.
2. State→zustand (R1-R3) is the highest-leverage starting point: unlocks devtools, simplifies R8-R13.
3. Panels→React (R4-R7) is the second cluster — biggest LOC reduction, deletes the bridge.
4. Geometry (R14-R18) blocks on a routing-library decision; that decision also resolves the deferred *auto-routing* item.
5. Each cluster lands on its own `task/migrate-<cluster>` branch per CLAUDE.md branch hygiene.
