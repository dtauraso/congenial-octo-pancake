# Phase 1 Verification — Substrate runs inside RF

**Status:** verified

## Findings

- **RF registration** (`tools/topology-vscode/src/webview/rf/app/_constants.ts`):
  `EDGE_TYPES = { animated: RSubstrateEdge }` and
  `RF_NODE_TYPES = { animated: RSubstrateNode, fold: FoldNode, note: NoteNode }` are
  passed to `<ReactFlow>` in `AppView.tsx:48-49`. Both substrate components are
  the sole registered types.

- **No parallel mount layer:** Grep for `createPortal`, `createRoot`, and
  `ReactDOM.render` across `src/webview/` found only:
  - `main.tsx` — single app root, expected.
  - `rf/panels/RunButton.tsx:23` — portals a toolbar button to `#run-mount`
    (a `<span>` in the VS Code chrome, `extension/html.ts:50`). This is pure UI
    chrome (run/stop button + status label), not substrate logic.
  - `substrate-r/Wire.tsx` — no `createPortal` at all.

- **Animation entry point** (`RSubstrateEdge.tsx:108`): `<Wire>` is mounted
  directly inside `RSubstrateEdge`. Pulse animation runs entirely within the RF
  edge component tree.

- **Wire.tsx portal check:** `Wire.tsx` contains no `createPortal`. The
  `WireLoop` class animates via RAF on a `<path>` ref inside the RF SVG layer.

## Parallel mounts found

None that involve substrate logic. The `RunButton` portal targets a VS Code
toolbar slot and carries no node/wire/slot state.

## Conclusion

Phase 1 already holds. All substrate logic (node bodies, wire animation, slot
state) runs inside RF custom components. There is no parallel mount layer
outside the RF tree.
