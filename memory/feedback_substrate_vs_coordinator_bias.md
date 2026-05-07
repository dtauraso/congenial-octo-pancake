---
name: substrate_vs_coordinator_bias
description: User works in substrate/dataflow shape; default coordinator-shaped framings are friction, not a clarity win
type: feedback
---

When designing fixes for this repo, bias toward **locality, composition, and predicates owned by the source** — not toward a coordinator that reads global state and routes decisions. The substrate is dataflow: nodes own their own gates, edges back-pressure locally, behavior emerges from wiring.

**Why:** the dominant style in AI training corpora prizes a single linear narrative, a central locus of control, and explicit hand-holding for a reader tracing one thread top-to-bottom. That style produces coordinator-shaped fixes (global schedulers, central buffers, policy knobs in one place) which read as "professional" but lie about what a substrate system actually is. The user has corrected this repeatedly — most sharply in the in0 seed-gating session (2026-05-06), where a 10-chunk global-scheduler plan with 5 policy forks had to be reframed twice before landing on a per-source predicate. The user is doing extra translation labor every time this drift happens; the cost compounds.

**How to apply:**
- Before drafting a fix, ask: "would this still be the right shape if no human ever read the source — only the runtime?" If the shape exists to make a linear reader's job easier, it's probably wrong here.
- Watch for smells: a central drain that knows about a specific subsystem, a "policy" parameter, a coordinator that imports both sides of a problem, multi-fork plans that need a global decision before any chunk lands.
- Prefer: per-source predicates, registries the source registers itself into, gates owned by the node whose behavior they constrain, composition rules over orchestration.
- When unsure, surface the shape concern to the user *before* drafting chunks — "this is starting to look coordinator-shaped, want me to invert it?" — rather than producing a top-down draft and waiting for correction.
