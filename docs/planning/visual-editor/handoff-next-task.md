# Next task: fan-out / distribute node (commit 5 of slot-in-node)

**Branch:** `task/substrate-slot-in-node`.
**Status:** join landed at `79ede00`. Topology `srcA, srcB → join →
readgate` runs end-to-end. Multi-slot firing rule (coincidence) is
proven. Gates green: tsc clean, 123/123 tests, `check:loc` clean.

The next missing primitive is fan-out: one source emitting onto
multiple wires (one input slot, ≥2 output wires). Until it lands,
the substrate can't express any topology where one value drives two
or more destinations — needed for lateral inhibition, distribute,
and any AND-tree reduction.

## What to read

1. [MODEL.md](../../../MODEL.md) — slot phases, firing rules, and
   the rule that emission requires all targeted output wires to be
   `canAccept`.
2. [Node.tsx](../../../tools/topology-vscode/src/webview/substrate-r/Node.tsx)
   — slot API; no change expected.
3. [node-kinds.tsx](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds.tsx)
   — `RelayBody` and `JoinBody` are the templates. Fan-out is a
   relay with N outgoing wire refs instead of one.
4. [TopologyRoot.tsx](../../../tools/topology-vscode/src/webview/substrate-r/TopologyRoot.tsx)
   — `findWireForOutput` returns one wire id; fan-out needs the
   plural variant (collect every wire whose `source.nodeId/port`
   matches).

## Target shape

- Register `fanout` in `NODE_KIND_PORTS` with `inputs: ["in0"]` and
  outputs `["out"]`. Multiple wires share the same source port — the
  substrate doesn't need distinct output ports for this case; the
  wire identity does the work.
- `FanoutBody` declares slot `["in0"]` and an `onRun` that fires
  only when slot is `filled` AND **every** outgoing wire returns
  `canAccept`. On fire: consume once, load the same value on each
  outgoing wire.
- Update `TopologyRoot` to pass an array of `outWireRefs` to
  `FanoutBody`.

## Topology under test

  `src → fanout.in0` (cohort 0)
  `fanout.out → gateA.in0` (cohort 1)
  `fanout.out → gateB.in0` (cohort 1)

## Contract assertions

1. parseSpec: both fan-out wires get cohort 1; the input wire is
   cohort 0.
2. After two `step`s, both readgate buttons arm (both slots filled
   with the same value).
3. **Backpressure-asymmetry case:** consume `gateA`'s slot but
   leave `gateB`'s filled. Re-arm the source with another input
   value and step. The fan-out must NOT emit until `gateB`'s slot
   is also empty — i.e. `canAccept` is conjunctive across all
   outgoing wires. Verify the upstream slot stays `filled` and no
   pulse appears on either output wire.

## Latent hazards

- The "all-canAccept" rule means partial emission is forbidden. If
  one downstream is full, the fan-out parks; if it emits to A and
  then sees B full, you have a duplicate-delivery hazard later.
  Atomic check-then-load in a single `onRun` body is the only safe
  shape — the test must exercise the parked path.
- Cohort assignment already handles this: each outgoing wire
  inherits `max(predecessors of fanout) + 1` independently, so
  multiple outputs all sit at the same cohort. No spec.ts change
  expected.

## Housekeeping (carry forward)

- Fix `check-substrate-vocab.mjs` path (`substrate/` → `substrate-r/`).
- Flag `task/in0-readgate-emission-ack` for user-approved deletion.
- Pre-existing `topology.view.json` working-tree diff still untouched.

## ALWAYS clause

(See handoff.md — same clause applies.)
