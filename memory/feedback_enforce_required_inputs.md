---
name: Propose robust solutions that fit the model spec
description: When a node type's correctness depends on a declared input being wired, propose a solution that the model enforces — mark the port required and fail parseSpec if it's missing.
type: feedback
originSessionId: 96608f66-f9a2-47a3-bd1f-48841e9eb98a
---
When designing a feature where a node's behavior depends on a specific
input being present (e.g. ReadGate.ack gating chainIn), propose a
solution whose correctness is **enforced by the model and schema**, not
by the user remembering to wire it. Make the input required at the
schema level and have `parseSpec` reject specs that omit the wire.

**Why:** In task/readgate-ack-button a Button → readGate1.ack wire
gated chainIn. `runNode` builds inputs from edges actually present in
the spec, not from the schema's declared ports — so removing btn1 and
its edge silently reverted ReadGate to one-input behavior (pulses keep
flowing). The model in MODEL.md treats wires as first-class with an
ordinal phase contract; a design that depends on a wire being present
must be one the model can enforce, not one that hopes for it. The
schema already declares ack as an input and specs already run through
parseSpec, so validation is mechanical and load-time. The work was
torn back out so the next attempt can land the enforcement first.

**How to apply:** Before proposing a feature whose behavior depends on
a specific input or output wire, check that the proposal fits the
model spec end-to-end: (a) add `required: true` to the port definition
and a validation pass in parseSpec that errors on missing required
wires, or (b) split the schema into `requiredInputs`/`optionalInputs`.
Pair the substrate change with the validation in the same commit —
never ship substrate-side gating without the load-time check. Same
principle applies to required output wires. Ask before proposing: "if
a user deletes the supporting node and edge, does the system fail
loudly or silently?" If silently, the proposal isn't robust — revise
before presenting it.
