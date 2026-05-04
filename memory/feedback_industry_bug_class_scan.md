---
name: Scan for industry bug-classes before the user finds them
description: When touching code in a known bug-prone category (animation/timing/state, IPC, persistence, concurrency), name the well-known bug class first and check against it
type: feedback
---

When code I'm writing falls into a category with a known catalog of "everyone hits this" bugs, name the bug class out loud and check the change against it *before* the user has to repro and report.

**Why:** the user has only been exposed to a few of these via lived experience. They explicitly said: "I'm suspecting the industry is niched so much I could not have known to check the industry for these bugs as I was never exposed to them." That asymmetry is mine to close — I have the catalog, they don't. If I sit on it until they hit a symptom, we waste a round-trip per bug. We hit this exact pattern three times on wirefold (AnimatedEdge wall-clock decoupling → fold halo wall-clock decoupling → unified-sim-clock fix that should have been the first move).

**How to apply:** when starting or reviewing a change, classify it. If it falls in any of these buckets, do the scan *before* declaring the change ready:

- **Animation / time-based UI**: is wall-clock time (`Date.now`, `performance.now`, `setTimeout` for decay) used while a logical clock (sim clock, video clock, scrub position) exists? → unify on the logical clock. Symptoms: pause-decoupling, drift, "it kept going after I paused."
- **Model/view temporal decoupling** (a.k.a. logical-time vs presentation-time, "fixed-timestep simulation with interpolated rendering"): does the view subscribe to the *model's* event stream (which fires at logical-instant times) when the user perceives the visual *animation arrival* as the meaningful moment? → bind the view to the animation lifecycle (anim-start/anim-end), not the raw model events. Symptoms: "the indicator lit up before the pulse arrived," "the badge showed `complete` while the bar was still filling." Canonical fix: view state = f(model event, animation params, current wall time). Names: Glenn Fiedler's "Fix Your Timestep!" (games), DES playback speed (SimPy/OMNeT++/Verilog), implicit animations (Flutter/SwiftUI), client-side prediction with rollback (networked games).
- **State subscriptions / event listeners**: do all subscribers detach on unmount? Is one throwing subscriber going to take down the bus? → isolate listener throws; route to a probe.
- **Persistence / dump-on-debounce**: does an empty snapshot overwrite a meaningful one? → guard with `if (snapshot.length === 0) return;`.
- **`this`-binding on host APIs**: are `setTimeout`/`clearTimeout`/`addEventListener` etc. assigned as object methods? → wrap in arrow fns ("Illegal invocation" in browsers).
- **Concurrency / channels / goroutines**: writer-without-reader deadlocks? channel overwrite without backpressure? unbounded fan-out? → check the wirefold latch+ack pattern in `docs/latch-backpressure.md`.
- **Caching / memoization**: keyed correctly? invalidated on the right events? stale-while-revalidate semantics intentional?
- **Replay / determinism**: any wall-clock or `Math.random` reads inside the replayable path? → must be seeded or driven from the trace.
- **Pause/resume of any kind**: every counter, timer, and animation in scope frozen consistently? → if more than one site reinvents pause bookkeeping, that's the signal to unify on a frozen-on-pause clock.
- **React effect deps**: do object/array deps trigger remounts they shouldn't? Is cleanup symmetric with setup?
- **Diff / merge / undo**: is the inverse operation actually inverse? Round-trip identity test exists?

When a scan-bucket matches, state the class + the check explicitly in the working text so the user sees the reasoning, not just the patch. If no bucket matches, skip — this is a filter, not a ritual.

Add buckets to this list when a new class shows up in this codebase. Removing buckets is fine if they prove not load-bearing here.
