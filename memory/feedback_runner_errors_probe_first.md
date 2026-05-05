---
name: Check the runner-errors probe before guessing
description: When the visual editor hangs, decouples, or shows compound UI symptoms, first read .probe/runner-errors-last.json — caught throws often explain the whole chain.
type: feedback
---

When a webview symptom is some combination of "play button stuck",
"pulses decoupled from play state", "ticks not advancing", "halo
missing", or any other "X is broken since I touched Y" report — read
`../.probe/runner-errors-last.json` *before* forming hypotheses or
asking the user to copy a console stack.

**Why:** a thrown subscriber inside `runner.notify()` aborts the
listener loop, propagates up through `stepOnce()`, and leaves
`playing = true` with no interval set. One upstream throw can produce
three independent-looking UI symptoms. Diagnosed this exact pattern
2026-05-04: a `TypeError: Illegal invocation` from
`createFoldActivityTracker`'s default setTimer (setTimeout assigned
as an object method, losing global `this`) showed as broken halo +
decoupled pulses + stuck play button — all one bug.

**How to apply:**

1. `cat .probe/runner-errors-last.json` (or `Read` from the editor)
   — if `entries: [...]` has a stack, that's almost certainly the
   root cause. The file auto-dumps 250ms after each catch.
2. If empty, check `../.probe/fold-halo-last.json` for the halo
   timeline and `../.probe/pulse-last.json` for pulse drift.
3. Only then look at the symptom-side code. Symptom-side changes are
   often a wild goose chase when the real bug is one upstream throw.

The runner is hardened to keep stepping past listener throws (so the
sim doesn't go all-the-way-dead), but a thrown listener is still a
correctness bug for that subscriber — the probe entry is the
authoritative trace.
