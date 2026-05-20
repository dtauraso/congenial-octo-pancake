# ChainInhibitorNode

## Ports

| Name | Direction | Element type | Cardinality | TSX handle | Side |
|------|-----------|--------------|-------------|------------|------|
| FromPrevChainInhibitorNode | in | int | single | FromPrevChainInhibitorNode | left |
| ToNextChainInhibitorNode | out | int | single | ToNextChainInhibitorNode | right |
| ToReadGate | out | int | single | ToReadGate | right |
| ToEdge | out | int | fan-out | ToEdge | right |
| ToEdgeNew | out | int | fan-out | ToEdgeNew | right |

## Non-channel fields

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| HeldValue | int | `data.initialSlots.held` | Initial value held in the inhibitor slot; defaults to 0 |

## Firing rule

Block until a value arrives on FromPrevChainInhibitorNode. On each arrival:

1. Emit HeldValue on every channel in ToEdge (fan-out).
2. Emit the incoming value on every channel in ToEdgeNew (fan-out).
3. Emit HeldValue on ToNextChainInhibitorNode.
4. Update HeldValue = incoming value.
5. Emit 1 on ToReadGate.

HeldValue is the previously-held value; ToEdge receivers get the old value, ToEdgeNew receivers get the new value. ToNextChainInhibitorNode propagates the old value down the inhibitor chain. ToReadGate signals completion.

## View

| Field | Value |
|-------|-------|
| kind | chainInhibitor |
| bg | #fff3e0 |
| border | #e65100 |
| text | #bf360c |
| accent | #e65100 |
| minWidth | 90 |
| displays | held |
| defaultLabel | chainInhibitor |

## Runtime status

- Loader-registered: yes
- TSX render: present

## Open questions

- TSX only renders `ToEdge` and `ToNextChainInhibitorNode` handles; `ToEdgeNew` and `ToReadGate` are absent from the current render. Port manifest and Go struct include all four outputs.
