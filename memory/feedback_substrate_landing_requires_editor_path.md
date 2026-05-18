---
name: feedback-substrate-landing-requires-editor-path
description: "Wire props still need editor-path (RSubstrateEdge) dispatch in the same commit. TopologyRoot was deleted in task/editor-friction-pass — the test-path fork no longer exists."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 6dced147-a194-42e4-b2c1-ca198681ea3b
---

**TopologyRoot deleted (task/editor-friction-pass, item 1).** The test-path fork is gone. Only one dispatch site remains.

**Remaining scope:** wire props. `RSubstrateEdge` threads wire props from the React Flow store into `<Wire>`. A new wire prop must land there in the same commit it is used. No second TopologyRoot path.

Node kinds remain auto-landed via the shared `renderKindBody` switch in `node-kinds.tsx`. `RSubstrateNode` is the only caller. Adding a kind = one switch case + the `RNodeKind` type in `spec.ts`.

**How to apply:**
- New node kind: edit `renderKindBody` switch + `RNodeKind` type. Done.
- New wire prop: thread through `<Wire>` in `Wire.tsx` and through `RSubstrateEdge` in the same commit.

Related: [[derive-model-from-visual-spec]], [[enforce-required-inputs]].
