## 2026-05-04 — fold halo bug + runtime-error probe pattern

**Branch:** main (single-session work, landed in 73007f4 + follow-ups)
**Mode:** friction-driven fix during real-world fold/halo iteration

Symptom chain (user-visible, in order of report):
1. Fold node's halo "not happening" — turned out to be a misread of
   what was visible (perimeter halo too subtle vs. dashed border).
2. After moving to a port-dot halo: "halo always off" + "pulses
   decoupled from play/pause" + "fold mode halo strobe."

Root cause: `createFoldActivityTracker`'s default `setTimer` was
`{ set: setTimeout, clear: clearTimeout }`. When invoked as
`setTimer.set(fn, ms)`, JS binds `this = setTimer`, and browsers'
`setTimeout` requires `this = window` → throws
`TypeError: Illegal invocation` on every member fire.

The throw propagated up through the runner's `notify()` (no try/catch
at the time), aborted the listener loop mid-iteration, and from
`stepOnce()` up into `play()` — which set `playing = true` *before*
the throw and never created the interval. Result: button shows pause,
no ticks, no pulses, no halo. All four symptoms from one bug.

Fix (single line): wrap the defaults so the calls invoke
`setTimeout(fn, ms)` with the correct global binding.
Regression test added at
[fold-activity.test.ts](../../../tools/topology-vscode/test/fold-activity.test.ts)
("noteFire and decay run without 'Illegal invocation' on real timers").

### Diagnostic infrastructure that paid for itself

The bug was diagnosed by reading
`../../../.probe/runner-errors-last.json` directly — the user never had to
copy a console trace. The probe was set up earlier in the same
session as a quasi-automation play after the user asked whether I
could run the diagnostic steps myself (I can't drive the VS Code
webview UI, but I can route caught throws to disk).

Pattern: any caught exception in a webview listener → push to
`window.__runnerErrorsLog` → debounced postMessage to host →
`../../../.probe/runner-errors-last.json`. Eager init in
[runner.ts](../../../tools/topology-vscode/src/sim/runner.ts)
(`reportRunnerError` + `__runnerErrorsDump` globals) so the bridge
is alive before any error fires. Mirrors the pulse-probe and
fold-halo-probe lifecycles.

**Followups (open the next time something throws and the runner
state goes weird):**
- First check: `cat .probe/runner-errors-last.json`. If it has a
  stack, you're 80% done.
- Then: `cat .probe/fold-halo-last.json` for the halo timeline (mount
  / start / end transitions; verbose `fire` entries gated behind
  `window.__foldHaloProbeVerbose = true`).
- The runner now isolates listener throws so a buggy subscriber can't
  take the simulator down — but a thrown listener is still a
  *correctness* bug for that subscriber. Don't ignore the probe entry.

**Lesson logged for future sessions:**
- When a webview UI symptom is "X stuck" + "Y decoupled" + "Z
  missing" simultaneously, the cheapest first move is to check the
  runner-errors probe — these are usually one upstream throw, not
  three independent bugs.
- When adding a method to a config object, never put a globally-bound
  function (`setTimeout`, `clearTimeout`, `addEventListener`,
  `requestAnimationFrame`, etc.) directly as the value. Wrap in an
  arrow so the global `this` is preserved.
