# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-16)

**Active branch:** `task/pulse-secondary-value` — 9 commits ahead of main.
Not yet merged. Do not merge without explicit sign-off.

Driving live in the editor right now. Animation behavior is being
investigated round-by-round; we keep clearing `.probe/webview-log.jsonl`
between runs and delegating log walks to sonnet subagents.

## What landed this session

Latest commit: `3815643 feat(chaininhibitor): shift-register fanout w/
seed; drop readgate sig guard`. Contents:

- **ChainInhibitor** is now a 1-round shift register that fans out to
  both `out` and `inhibitOut`. On in-fill: emit prior held on both
  wires, store incoming, slot empties. **No `canAccept` guards** on
  output wires — emit is unconditional once `in` is filled. Seed
  plumbed via topology `data.seed` (i0 and i1 seeded with `0`).
- **Wire.load** swallows reloads while in-flight (logs
  `trace.wire.load.dropped` to `.probe/webview-log.jsonl`) so the editor
  doesn't crash on ring saturation. The reducer's throw is still in
  place as a safety net.
- **ReadGate** `lastPartialSigRef` guard removed. Partial fill emits
  `0` unconditionally; full fill emits `1` and consumes. `canAccept` is
  the only emit gate.
- Tests: split `r-topology-readgate-register.test.tsx` into
  `r-topology-register.test.tsx` + `r-topology-readgate-partial.test.tsx`
  (LOC budget). B2 of `r-topology-chaininhibitor-fanout` dropped (its
  "CI blocks on wire backpressure" premise no longer exists).

129 tests green; build clean; tsc clean; vocab clean; LOC clean.

## Where the investigation is

User reports animation still stalls. The current diagnosis (across
several rounds): the topology is a closed feedback ring (src →
readGate → i0 → i1 → readGate.chainIn2) with 1-slot buffers. Every
src arrival eventually produces 2 readGate emits (partial 0 + full 1),
which adds pulses to the ring faster than the ring drains. After ~5
cycles the ring saturates and deadlocks.

Earlier this session we tried a `pendingRef` buffer (consume + emit
decoupled) — that pushed saturation a few cycles further but didn't
eliminate it. User rejected it: "I treated the symptom as the disease."
We reverted to atomic 2abc and then dropped the canAccept guards.

The wedge now manifests as either (a) `trace.wire.load.dropped` events
piling up in the log when ChainInhibitor emits onto an in-flight wire,
or (b) a slot somewhere stays filled and pulses stop arriving. Neither
has been root-caused on the latest code.

## Open questions / next moves

- Is the right fix a structural change to the topology (break the
  closed ring, or add explicit buffering at one point), or is there
  a rule change at one node (ReadGate? ChainInhibitor?) that prevents
  the per-src-arrival 2-pulse amplification?
- User has emphasized the substrate should not require subscription
  bookkeeping. The wake mechanism currently still uses
  `subscribeCanAccept` from node bodies (with both `out` and
  `inhibitOut` subscriptions for ChainInhibitor). An earlier attempt
  to move wake into the substrate (`sourceNodeRef` on Wire, direct
  `.run()` calls) was reverted — it made things worse.
- The Wire.load-dropped trace may be papering over real
  rate-imbalance bugs. Consider whether dropped loads should be
  surfaced as a hard fail in dev (assertion + console.error) once
  the editor is debuggable.

## The model (settled)

- **No tick, no step.** Driver: `halt`/`resume` + `pauseAxis`.
- **canAccept IS the trigger** (wire empty + dest slot empty).
- **Pulse payload is a scalar.** ReadGate emits `0`/`1`; Register and
  ChainInhibitor are 1-round shift registers on the scalar.
- **ChainInhibitor's 2abc rule (this session's settled spec):** when
  `in` fills → emit held on both wires, store incoming, slot empty.
  Atomically, no output-wire preconditions.

## Working mode

- Delegate executor work (log walks, mechanical edits) to sonnet/haiku
  subagents. Main session is for judgment.
- Don't propose menus of options when the user is mid-investigation;
  finish the current frame.
- Verify subagent claims (especially log readings) before acting on
  them — earlier this session a sonnet agent confidently misread a log.
- When the user says "delegate", they want a subagent call, not the
  main session doing the work inline.

## Dev-loop

After any substrate-r edit: `npm run build` (vitest/tsc don't refresh
`out/webview.js`). Live log at `.probe/webview-log.jsonl`; clear with
`: > .probe/webview-log.jsonl` between runs.

Cwd for tsc/tests/check:loc/build: `tools/topology-vscode/`.

## Open branches

- `main` — production trunk.
- `task/pulse-secondary-value` — active; 9 commits ahead; not merged.

## ALWAYS clause

At end of session, overwrite this file with a freshly-rendered
prompt tailored to the state you're leaving the branch in, and
commit on the active branch (main if no task is in flight). Do not
rely on chat history; the next AI may be a fresh model with no
transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes.
