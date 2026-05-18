---
name: feedback-edge-seed-required-for-rings
description: Ring topologies need edge-level seed:N on the feedback edge to break startup deadlock; substrate-r now reads edge.data.seed and fills the dest slot once on mount.
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 4d5176b2-1c69-4013-9932-e601ea592a86
---

Edge-level `seed` (on `wire.data.seed` in the spec, `RWireSpec.seed` in substrate-r) primes the destination slot of a wire once at wire mount. Required for any ring topology where a downstream node depends on a feedback input that the ring itself produces — without the seed, both sides wait on each other and never start.

**Why:** Concrete instance — the edge-detector ring (in0 → ReadGate → i0 → i1 → ReadGate). ReadGate's `chainIn2` is fed by i1, which is fed (transitively) by ReadGate. With the partial-0 emit rule removed (see [[feedback-readgate-partial-0-is-spec]]), ReadGate refuses to fire until both slots are filled, so without a seed on `i1.out->readGate.chainIn2` the ring never starts. The user said: "i1 needs to send an initial seed pulse to readgate only 1 time so readgate starts." Edge seed implements exactly that contract.

**How to apply:** When designing a ring topology, identify the feedback edge (the one closing the loop). Put `seed: <value>` on its `data` so the downstream slot is filled at mount. The seed is one-shot — it does not re-fire on subsequent loops. Do not propose seeding via a `node.props.seed` to a non-boundary node as a substitute; node-level seed only works for ChainInhibitor's internal `heldRef`, not for filling a slot at startup.
