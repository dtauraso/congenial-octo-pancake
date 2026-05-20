# SyncGateNode

## Ports

| Name | Direction | Element type | Cardinality | TSX handle | Side | Accent |
|------|-----------|--------------|-------------|------------|------|--------|
| FromA | in | int | single | FromA | left | |
| FromB | in | int | single | FromB | left | |
| ToRelease | out | int | single | ToRelease | right | #80cbc4 |

## Firing rule

Buffer one value from each input independently. When both FromA and FromB have been received, fire:

- Emit 1 on ToRelease (unconditionally; input values are not used).
- Clear both buffers.

Synchronizes two completion signals into a single release pulse. Input values are consumed but ignored.

## View

| Field | Value |
|-------|-------|
| kind | syncGate |
| bg | #f3e5f5 |
| border | #7b1fa2 |
| text | #4a148c |
| accent | #7b1fa2 |
| minWidth | 70 |
| defaultLabel | syncGate |

## Runtime status

- Loader-registered: yes
- TSX render: present
