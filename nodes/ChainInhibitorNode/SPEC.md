# ChainInhibitorNode

## Ports

| Name | Direction | Element type | Cardinality | TSX handle | Side |
|------|-----------|--------------|-------------|------------|------|
| FromPrevChainInhibitorNode | in | int | single | FromPrevChainInhibitorNode | left |
| ToNext | out | int | fan-out | ToNext | right |

## Non-channel fields

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| HeldValue | int | `data.initialSlots.held` | Initial value held in the inhibitor slot; defaults to 0 |

## Firing rule

Block until a value arrives on FromPrevChainInhibitorNode. On each arrival:

1. Emit HeldValue on every channel in ToNext (fan-out).
2. Update HeldValue = incoming value.

HeldValue is the previously-held value. All ToNext receivers get the old value. Destinations include downstream ChainInhibitor nodes, edge-gate inputs, and the ReadGate pacing port — all wired as entries in the ToNext fanout slice.

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

