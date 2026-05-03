# Phase 4.5 — plugin hardening (audit-driven)

**Cap:** ~3.75 total across 5 sub-phases. **$ extra-usage est:** ~$210 total (range $110–$355).
- 4.5.1 done (~¼ actual, Go/TS edits, 0.75×): ~$11 equivalent (pre-spillover).
- 4.5.2 (~¾, mixed): ~$45 (range $25–$75).
- 4.5.3 (~½, packaging — cache-heavy 0.5×): ~$15 (range $10–$30).
- 4.5.4 (~¾, mixed): ~$45 (range $25–$75).
- 4.5.5 (~1, test writing, 1×): ~$60 (range $30–$100).
- 4.5.6 opportunistic — uncosted.

⏳ Sourced from a full code-quality audit of `tools/topology-vscode/`. Five priority bands; do them in order — the bands are not interchangeable. Phase 4.5.1 is the "stop destroying user work" tier and gates everything else. Phase 4.5.5 is the test coverage that prevents the same bugs from re-shipping.

## Phase 4.5.1 — data-loss bugs ✅ [~¾ est / ~¼ actual]

- **[~¼ est / ~⅛ actual]** ✅ **C1.** Sidecar writes routed through `openTextDocument` + `WorkspaceEdit` + `doc.save()` so an open editor on the sidecar isn't clobbered (falls back to `fs.writeFile` when the file doesn't yet exist). Host posts `{type:"flush"}` to the webview on `panel.onDidChangeViewState(visible=false)`; webview's main message router calls `flushSave()`+`flushViewSave()` synchronously. `panel.onDidDispose` already disposes the now-tracked `viewStateSub`. ([src/sidecar.ts](../../tools/topology-vscode/src/sidecar.ts), [src/extension.ts](../../tools/topology-vscode/src/extension.ts), [src/webview/main.tsx](../../tools/topology-vscode/src/webview/main.tsx))
- **[~⅛]** ✅ **C2.** Deleted the local `viewSaveTimer` / `lastSyncedView` / `flushViewSave` / `scheduleViewSave` in [app.tsx](../../tools/topology-vscode/src/webview/rf/app.tsx); all callers now use the shared module-level debouncer in [save.ts](../../tools/topology-vscode/src/webview/save.ts). `markViewSynced(text)` re-syncs the watermark on `view-load`. Pan-then-bookmark inside the 400ms window now coalesces correctly.
- **[~⅛]** ✅ **H3.** `save` and `view-save` host handlers wrapped in try/catch; rejection posts `{type:"save-error", message}` back to the webview. (UI surfacing of the error is left as a follow-up — the rejection no longer silently corrupts state.)
- **[~⅛]** ✅ **C3.** Replaced text-equality suppression with `document.version` tracking. Watermark bumped synchronously to `version + 1` *before* `applyEdit` so the change event (which fires before `applyEdit`'s promise resolves) is filtered; resynced post-edit. No-op resaves and identical-text resaves no longer leak through.
- **[~⅛]** ✅ **H9.** `onNodeDragStop` non-fold branch mutates `spec.nodes[i].x/y` and calls `scheduleSave()`. Positions now survive disk reload. Manually verified.

## Phase 4.5.2 — correctness & protocol [~¾]

- **[~¼]** ⏳ **H4.** Webview↔host messages are read with no schema validation; could write `[object Object]` to disk. Define a discriminated-union `WebviewToHostMsg` / `HostToWebviewMsg` shared by both sides; type-narrow before use; reject unknown types. ([src/extension.ts:70-91](../../tools/topology-vscode/src/extension.ts#L70-L91), [src/webview/main.tsx:29](../../tools/topology-vscode/src/webview/main.tsx#L29))
- **[~⅛]** ⏳ **H5.** `parseViewerState` returns `v as ViewerState` with no shape validation — hand-edited sidecars crash consumers. Mirror `parseSpec`'s validation discipline; on failure, log + return defaults. ([src/webview/viewerState.ts:36-44](../../tools/topology-vscode/src/webview/viewerState.ts#L36-L44))
- **[~⅛]** ⏳ **H8.** Camera persists both legacy `{x,y,w,h}` viewBox (zeroed) and `zoom`; the viewBox-fallback path divides by zero in [camera.ts:15](../../tools/topology-vscode/src/webview/camera.ts#L15) for sidecars without `zoom`. Pick one representation; migrate older sidecars on load. ([src/webview/rf/app.tsx:196-199](../../tools/topology-vscode/src/webview/rf/app.tsx#L196-L199))
- **[~⅛]** ⏳ **H7.** `lastSelectionIds` re-application across `load`/`view-load` arrival order leaves stale selection. Always reconcile selection on `view-load` (drop selected when not in saved set), or wait for both messages before initial render. ([src/webview/rf/app.tsx:117-124](../../tools/topology-vscode/src/webview/rf/app.tsx#L117-L124))
- **[~⅛]** ⏳ **M9.** Mixed delete (fold + node) skips `rebuildFlow`; stale visuals persist until host round-trip. Make `handleDelete` call `rebuildFlow()` after mutating spec. ([src/webview/rf/app.tsx:241-261](../../tools/topology-vscode/src/webview/rf/app.tsx#L241-L261))

## Phase 4.5.3 — reach & packaging [~½] *(do before any install/publish)*

- **[~⅛]** ⏳ **H6.** Custom-editor `filenamePattern: "topology.json"` matches only literal name; `my-topology.json` won't open. Broaden to `**/*topology.json`. ([package.json:18-22](../../tools/topology-vscode/package.json#L18-L22))
- **[~⅛]** ⏳ **H1.** `bundleWatcher` is `createFileSystemWatcher(absoluteString)`; `GlobPattern` only matches inside the workspace, so the watcher silently never fires for installed users. Wrap in `RelativePattern`, or gate on `context.extensionMode === Development`. ([src/extension.ts:55-56](../../tools/topology-vscode/src/extension.ts#L55-L56))
- **[~⅛]** ⏳ **H2.** Watcher / topogen / runner / docSub leak on activation failure (only disposed via `panel.onDidDispose`). Push every disposable into `context.subscriptions`. ([src/extension.ts:56,65](../../tools/topology-vscode/src/extension.ts#L56))
- **[~⅛]** ⏳ **M13.** `.vscodeignore` ships `test/**`, `e2e/**`, `*.config.*`, sourcemaps, `package-lock.json`, `playwright-report/`, `test-results/` in the VSIX. Add the missing exclusions. ([.vscodeignore](../../tools/topology-vscode/.vscodeignore))

## Phase 4.5.4 — runtime hygiene [~¾]

- **[~⅛]** ⏳ **M2.** `cp.exec` for topogen has a 1MB stdout cap — large diagnostics kill the run with ENOBUFS. Use `cp.spawn("go", ["run", "./cmd/topogen", "--check"])` and stream stderr (consistent with `runCommand.ts`). ([src/topogenRunner.ts:48](../../tools/topology-vscode/src/topogenRunner.ts#L48))
- **[~⅛]** ⏳ **M3 / M4.** `kill("SIGTERM")` on `go run` leaves the inner binary orphaned on macOS; cancellation detection by signal name races against natural exits. Spawn with `detached: true`, kill the process group; track an explicit `cancelled` flag. ([src/runCommand.ts:29,50-53](../../tools/topology-vscode/src/runCommand.ts#L50-L53))
- **[~⅛]** ⏳ **M7 / M8.** `retainContextWhenHidden: true` plus an unconditional RAF loop plus per-node WAAPI animations drains battery on hidden tabs; `notify()` allocates a fresh array each frame. Pause RAF + animations on `document.visibilitychange`; reuse the array. ([src/extension.ts:13](../../tools/topology-vscode/src/extension.ts#L13), [src/webview/playback.ts:111-118](../../tools/topology-vscode/src/webview/playback.ts#L111-L118))
- **[~⅛]** ⏳ **M1.** CSP `style-src ${webview.cspSource}` may block any `<style>` element React Flow injects (inline `style=` attributes are fine without `'unsafe-inline'`; injected `<style>` is not). Verify in webview devtools; add `'unsafe-inline'` if RF requires. ([src/extension.ts:106-108](../../tools/topology-vscode/src/extension.ts#L106-L108))
- **[~⅛]** ⏳ **M10.** Module-level `let spec` mutated in place defeats any future `useEffect([spec])`. Treat spec as immutable; produce new objects on edit. ([src/webview/state.ts:6](../../tools/topology-vscode/src/webview/state.ts#L6))
- **[~⅛]** ⏳ **M6 / M12.** Audit `path` reconstruction in `sidecar.ts` for Windows (`Uri.joinPath` instead of string concat); confirm webview loads `.map` files for production stack traces. ([src/sidecar.ts:5-8](../../tools/topology-vscode/src/sidecar.ts#L5-L8), [esbuild.mjs:10](../../tools/topology-vscode/esbuild.mjs#L10))

## Phase 4.5.5 — test coverage to lock the audit findings [~1]

- **[~½]** ⏳ Extension-host integration tests via `@vscode/test-electron`: sidecar I/O, message protocol round-trip, debounce flush-on-dispose, applyEdit version-suppression. The audit's Critical and High items are concentrated in host code that has zero test coverage today; this is the load-bearing addition.
- **[~⅛]** ⏳ `parseSpec` rejection-path tests (every reject branch in [src/schema.ts](../../tools/topology-vscode/src/schema.ts)).
- **[~⅛]** ⏳ `parseViewerState` validation tests (will fail until H5 lands; that's the point).
- **[~⅛]** ⏳ `onConnect` port-taken rejection test ([app.tsx:279-287](../../tools/topology-vscode/src/webview/rf/app.tsx#L279-L287)) — load-bearing invariant for codegen.
- **[~⅛]** ⏳ Camera-without-`zoom` regression test (would catch H8).
- **[~⅛]** ⏳ Node-drag persistence e2e test (will fail until H9 lands).
- **[~⅛]** ⏳ Add CSP meta to `e2e/harness.html` so prod-CSP bugs surface in Playwright instead of leaking past until install. ([e2e/harness.html](../../tools/topology-vscode/e2e/harness.html))

## Phase 4.5.6 — lows & nits [opportunistic]

Pick up while touching adjacent code; not a planned cap-hit. Includes: legacy SVG viewport restore size-dependence (L1), `EDGE_KIND_OPTIONS` duplication of `EDGE_KINDS` (L2), unused `view` import (L3), URL-safe nonce (L4), `flowToSpec` always-`"any"` debt (L5 — overlaps Phase 9), test-only `__wirefold_test` shipped in production (L7), empty-`contentChanges` filter (L8), dead `panStartListeners` (L9), `parseDur` NaN check on the `ms` branch (L10), toolbar HTML hand-built in host then bound by webview JS, `topogen` errors via `showErrorMessage` per save instead of OutputChannel, `package.json` missing `categories`/`repository`/`icon`/`engines.node`, tsconfig strictness (`noUncheckedIndexedAccess` etc.), no ESLint config. Also: saved-view click UX — currently captures + restores the camera at save time; tried `fitView` on `nodeIds` (no captured camera) but tuning was finicky (zoom too strong even with `padding: 0.4, maxZoom: 1.2`). Reverted to camera-capture; the `fitNodes` bridge entry + optional `viewport?` field on `SavedView` are left in place to make the next attempt cheap. `viewport` made optional on `SavedView` schema for forward-compat.
