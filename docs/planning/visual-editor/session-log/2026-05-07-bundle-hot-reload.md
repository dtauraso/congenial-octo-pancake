# 2026-05-07 — Bundle hot-reload in place (Reload Window obsolete)

## Friction

VS Code's "Developer: Reload Window" did not pick up freshly built
`out/webview.js`. The prior workaround (close+reopen the topology
tab) was manual and disrupted any in-flight editor state.

## Cause

Two bugs stacked:

1. The dev-mode `bundleWatcher` was created with an absolute path
   string. VS Code treats string globs that aren't relative to a
   workspace folder as never-matching, so the watcher never fired.
2. Even when HTML was re-rendered, the webview-resource URI for
   `webview.js` had no cache buster, so VS Code's webview cache
   served the previous bundle.

## Fix (commit d7983ab)

- Switched watcher to `RelativePattern` rooted at the extension's
  `out` dir.
- Stamped `?v=<mtime>` onto the script/style URIs in
  `buildWebviewHtml`.
- Watcher action stays as `panel.webview.html = build...` (debounced
  150ms), no dispose+reopen.

## Workflow now

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Logs at Output → Log (Extension Host):
`[topology] bundleWatcher fired: change` and
`hot-reload: re-rendering webview.html`.

## Supersedes

[2026-05-07-reload-window-misses-webview-bundle.md](2026-05-07-reload-window-misses-webview-bundle.md).
The Reload Window path is no longer the dev loop; the question of
why Reload Window itself misses the bundle is moot.

## Side observation surfaced during this work

Cold-open and any in-editor doc edit (e.g., renaming a node) trip a
stuck-pulse: substrate emits the first pulse, AE re-subscribes
after `ae-received`, ack never returns, loop stalls. This is the
new blocker for port-plan step 2 — see
[../handoff-next-task.md](../handoff-next-task.md).
