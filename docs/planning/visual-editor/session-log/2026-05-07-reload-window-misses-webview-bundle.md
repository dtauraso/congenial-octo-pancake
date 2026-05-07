# 2026-05-07 — Reload Window does not pick up new webview bundle

## Friction

While iterating on the substrate runtime fixes, `npm run build`
produced a fresh `out/webview.js` but VS Code's "Developer: Reload
Window" command did not pick it up — the editor kept running the
previous bundle, making post-fix bug reports look like the fix had
silently failed. Closing the topology document tab and reopening it
DID load the new bundle.

## Probable cause

`tools/topology-vscode/src/extension.ts` installs a `bundleWatcher`
on `out/webview.js` (gated on `extensionMode === Development`) that
is supposed to hot-reload the webview HTML when the bundle changes.
This either (a) fires correctly on file change but VS Code's
webview cache wins, (b) doesn't run because the host extension also
needs to reload, or (c) only fires on a `vscode.workspace`-rooted
glob, not the absolute extension path used here. Not investigated
in this session.

## Workaround

Close the topology tab and reopen it. Skip "Developer: Reload
Window" — it's misleading.

## Why this matters for diagnostics

A stale bundle hides whether a fix landed. The substrate-log.jsonl
timestamps before/after a build are the cheap check: if no new
entries appear after the build's mtime, the new code isn't running.
Worth folding into the standard "verify a substrate fix" loop.

## Open question

Is bundleWatcher actually firing in dev? If not, that's a separate
small fix (one-shot, when this friction recurs).
