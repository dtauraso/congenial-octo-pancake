# Handoff — What just landed (Gate A pass)

`task/sim-substrate-sketches` merged to `main` at fbaaa2a and was
deleted (local + remote). The merge brought:
  - chan sketches (anim + wire) at
    [../sim-substrate/chan-anim.html](../sim-substrate/chan-anim.html)
    and [../sim-substrate/chan-wire.html](../sim-substrate/chan-wire.html).
  - Tabbed [index.html](../sim-substrate/index.html).
  - Pre-rebuild topology archived at
    [../sim-substrate/topology-pre-rebuild.json](../sim-substrate/topology-pre-rebuild.json)
    and [.view.json](../sim-substrate/topology-pre-rebuild.view.json).
  - Repo-root `topology.json` + `topology.view.json` swapped to a
    2-node `in08 → readGate1` pair (does not animate; intentional).
  - C6–C8 in [contracts.md](contracts.md) marked **OBSOLETE**.
  - [rebuild-plan.md](../sim-substrate/rebuild-plan.md) — the spec
    for this branch.

Gate A revisions made before merge: corrected lowest-index
attribution (came from the dropped select sketch, not chan); flagged
per-node running indicator as prose-only spec until port step 2;
clarified R5 does not forbid sub-frame tweening; deferred
buffered-vs-unbuffered decision to port step 1.
