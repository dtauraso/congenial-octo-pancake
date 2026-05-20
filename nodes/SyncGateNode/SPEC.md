# SyncGateNode

## Ports

| Name | Direction | Element type | Cardinality | TSX handle | Side |
|------|-----------|--------------|-------------|------------|------|
| FromA | in | int | single | FromA | left |
| FromB | in | int | single | FromB | left |
| ToRelease | out | int | single | ToRelease | right |

## Firing rule

Buffer one value from each input independently. When both FromA and FromB have been received, fire:

- Emit 1 on ToRelease (unconditionally; input values are not used).
- Clear both buffers.

Synchronizes two completion signals into a single release pulse. Input values are consumed but ignored.

## Runtime status

- Loader-registered: yes
- TSX render: present
