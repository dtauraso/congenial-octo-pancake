# AndGateNode

## Ports

| Name | Direction | Element type | Cardinality | TSX handle | Side |
|------|-----------|--------------|-------------|------------|------|
| FromA | in | int | single | FromA | left |
| FromB | in | int | single | FromB | left |
| ToOut | out | int | single | ToOut | right |

## Firing rule

Buffer one value from each input independently. When both FromA and FromB have been received, fire:

- out = 1 if (a == 1 AND b == 1), else out = 0
- Emit out on ToOut.
- Clear both buffers.

Each input is polled non-blocking; arrival order does not matter.

## Runtime status

- Loader-registered: yes
- TSX render: present
