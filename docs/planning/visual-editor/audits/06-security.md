### 6. Security

**What it checks.**

- **Webview ↔ extension messaging.** Every `postMessage` boundary
  in `tools/topology-vscode/src/` validates incoming payload shape
  and types. No `eval`, no unchecked `Function` constructor.
  Origin checks where applicable.
- **Command injection in `topogen` invocation.** The plugin spawns
  `topogen` (and possibly `go run`); arguments are passed as an
  argv array, never concatenated into a shell string. No
  user-controlled paths flow into `cwd` or env without
  normalization.
- **File write paths.** All writes (spec save, viewer state save,
  generated Go) are inside the workspace. No writes outside the
  workspace root. No symlink-following that could escape it.
- **Secret handling.** No tokens, keys, or credentials in
  `topology.json`, `topology.view.json`, generated Go, the session
  log, or any committed file. `.env` and similar should be
  `.gitignore`d.
- **Dependency CVEs.** `npm audit` and `go list -m -u all` clean,
  or each known issue documented and accepted.
- **Prototype pollution / unsafe JSON.** Webview-side JSON parsing
  doesn't accept `__proto__` / `constructor.prototype` keys
  unfiltered when they'd be merged into objects.

**Passing.** No findings, or each finding has a documented decision
(fix scheduled / accepted with reason / not applicable here).

**Cadence.** On demand. Recommended after any change touching the
extension/webview boundary, the spawn of `topogen`, or dependency
updates.

**Cost.** Medium ($5–$15 depending on scope).
