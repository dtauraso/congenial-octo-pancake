# topology-vscode — architecture map

One-screen orientation. Read this before grepping into the source tree.

## Two sides

```
extension host (Node)              webview (browser)
─────────────────────              ─────────────────
  src/extension.ts          ◄──►   src/webview/main.ts
  src/topogenRunner.ts             src/webview/render/...
  src/runCommand.ts                src/webview/<feature>.ts
  src/sidecar.ts                   src/webview/state.ts
  src/schema.ts (shared)
```

esbuild bundles each side separately ([esbuild.mjs](esbuild.mjs)).
Communication is `panel.webview.postMessage` ↔ `vscode.postMessage`.

## Message protocol (single source of truth)

Webview → extension: `ready`, `save`, `view-save`, `run`, `run-cancel`.
Extension → webview: `load`, `view-load`, `topogen-status`, `run-status`.
Wired in `extension.ts` `panel.webview.onDidReceiveMessage`. Webview side
in `src/webview/save.ts` (sender) and `src/webview/main.tsx` (handler).

## Extension side — what lives where

| File | Owns |
|---|---|
| `extension.ts` | `CustomTextEditorProvider`, webview HTML/CSP, `applyEdit`, message dispatch |
| `topogenRunner.ts` | Debounced `go run ./cmd/topogen` on save, status posting |
| `runCommand.ts` | "▶ run" button: spawns `go run .`, streams to output channel, cancellable |
| `sidecar.ts` | `topology.view.json` URI computation + read/write |
| `schema.ts` | Node-type registry + edge-kind colors (imported by webview too) |

## Webview side — feature files

Each `webview/<feature>.ts` owns one UI affordance. Most expose
`init…Panel()` + `refresh…Panel()`.

| File | Affordance |
|---|---|
| `main.ts` | Entry point, message handler, top-level orchestration |
| `state.ts` | Mutable shared state (`spec`, `view`, `viewerState`, SVG_NS) |
| `viewerState.ts` | Types for sidecar (`Camera`, `SavedView`, `Fold`, `Bookmark`) |
| `save.ts` | `vscode` API handle + sync detection + post helpers |
| `view.ts` | Camera (pan/zoom) → `viewBox` |
| `views.ts` | Saved-views panel (top-right) |
| `timeline.ts` | Bottom timeline (play/pause/scrub + bookmark markers) |
| `playback.ts` | Master playback clock animations register against |
| `rename.ts` | Double-click node-id in-place edit |
| `run.ts` | "▶ run" button + status pill |
| `defs.ts` | SVG `<defs>` (markers, gradients) |
| `geom.ts` | Coordinate / hit-test helpers |
| `src/webview/rf/app.tsx` | React Flow canvas — nodes, edges, handles, interaction |
| `src/webview/rf/AnimatedEdge.tsx`, `src/webview/rf/AnimatedNode.tsx` | Animated edge/node components |
| `src/webview/rf/adapter.ts` | Spec ↔ React Flow node/edge model conversion |

## Spec vs viewer state (load-bearing distinction)

- **`topology.json`** — round-trips through `topogen`; every field maps to
  generated Go. Edited through `save` messages. Owned by `extension.ts`
  + the document.
- **`topology.view.json`** — sidecar; camera/views/folds/bookmarks. Edited
  through `view-save` messages. Owned by `sidecar.ts` on the extension
  side, `viewerState.ts` types on the webview side.

If a field affects generated Go, it belongs in the spec. Otherwise the
sidecar. See [visual-editor-plan.md](../../docs/planning/visual-editor-plan.md).

## Editor substrate

The webview renders with **lit-html + plain SVG today**, migrating to
**React Flow inside the webview** during Phase 3 of the visual-editor
plan. `topogen` stays authoritative either way — the substrate change is
about *how nodes/edges are rendered and interacted with*, not about who
owns the spec.

What was rejected:

- Hand-rolling all gestures (selection, marquee, port-drag, fold
  re-routing) on top of lit-html + SVG. Viable but every gesture is its
  own custom state machine, hit-testing, and ghost-edge geometry.
- A standalone browser editor decoupled from codegen — the deleted
  `tools/topology-editor/` (commit `df2b101`). The lesson was *not*
  "React Flow is wrong" but "the editor must live inside the codegen
  pipeline."

Why React Flow specifically: subflows, multi-handle ports, and
controlled flows all stabilized together in v11 (late 2022), making the
library a viable substrate for a spec-driven editor where the spec —
not the library — is the source of truth. Adapters translate
`topology.json` ↔ React Flow's node/edge model.

See [docs/decisions/0001-react-flow-substrate.md](../../docs/decisions/0001-react-flow-substrate.md)
for the full decision record.

## Build

`npm run build` → `out/extension.js` (Node CJS) + `out/webview.js` (browser
IIFE) + `out/webview.css`. Watch mode via `npm run watch`.
