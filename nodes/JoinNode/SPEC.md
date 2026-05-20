# JoinNode

## Ports

| Name | Direction | Element type | Cardinality | TSX handle | Side | Accent |
|------|-----------|--------------|-------------|------------|------|--------|
| FromA | in | int | single | FromA | left | |
| FromB | in | int | single | FromB | left | |
| ToJoined | out | int | single | ToJoined | right | |

## Firing rule

Buffer one value from each input independently. When both FromA and FromB have been received, fire: emit one value on ToJoined (convention TBD — first arrived, sum, or tuple). Clear both buffers.

## View

| Field | Value |
|-------|-------|
| kind | join |
| bg | #1a1f2e |
| border | #58a6ff |
| text | #c9d1d9 |
| accent | #58a6ff |
| minWidth | 80 |
| sublabel | A + B |
| defaultLabel | join |

## Runtime status

- Loader-registered: no
- TSX render: present
