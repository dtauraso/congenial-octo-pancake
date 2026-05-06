## 2026-05-04 — smoothness audit re-run with always-on probe

**Branch:** task/probe-rerun-smoothness
**Mode:** smoothness audit (audits.md #5)
**Start cost:** $320.85

Scope: pan, zoom, node drag (no topology change), animation
playback, scrub, fold/unfold of existing folds, bookmark jump,
replay, view recall. The pulse visual probe is always on as of
`d771871` (main); periodically run `window.__pulseProbeReport()`
in the webview devtools console — empty array is a clean result
worth recording, non-empty entries are fresh friction.

- The probe output is now persisted to `../../../.probe/pulse-last.json`
  via a new webview→host message (`pulse-probe-dump`). The webview
  installs `__pulseProbeDump()` eagerly on module load; entries
  also auto-dump 500ms after each push, and a 5s heartbeat
  refreshes the file whenever any pulse rendered since the last
  dump (so clean runs produce confirmed `entries: []` evidence
  without a console call).
- Tooling friction: getting the bridge wired ate the session.
  Eager init was guarded by `!__pulseProbeLog` (broke on hot
  reload — fixed). `acquireVsCodeApi()` re-throws on the second
  call when the bundle re-executes against the same context
  (`retainContextWhenHidden: true`) — fixed by caching the API
  on `window.__vscodeApi`. Two spec attempts (cache-bust query,
  auto-reload watcher) caused VS Code-internal `toUrl` errors
  and were reverted. The final wrong-frame mistake (devtools
  console attached to outer wrapper, not the iframe running the
  bundle) was the longest dead-end — heartbeat dump removes the
  need for a console diagnostic, so the trap can't recur.

**Probe output:**
- First clean run after the bridge landed: `{"ts": 1777880387755,
  "entries": []}`. Scope exercised was minimal (node drag) — see
  followups for broader coverage.

**Followups (candidates, not commitments):**
- Drive the rest of the smoothness scope (pan, zoom, scrub, fold,
  bookmark jump, replay, view recall) and capture each as a
  separate dump (or accept heartbeat-overwritten last-state).
- If recurring drift entries appear, dig into the bezier-end
  label-drift hypothesis from the prior session (eps-precision
  in finite-difference tangent on flattening curves).
