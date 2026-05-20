# AndGateNode

## Ports

| Name | Direction | Element type | Cardinality | TSX handle | Side | Accent |
|------|-----------|--------------|-------------|------------|------|--------|
| FromA | in | int | single | FromA | left | |
| FromB | in | int | single | FromB | left | |
| ToOut | out | int | single | ToOut | right | #42a5f5 |

## Firing rule

Buffer one value from each input independently. When both FromA and FromB have been received, fire:

- out = 1 if (a == 1 AND b == 1), else out = 0
- Emit out on ToOut.
- Clear both buffers.

Each input is polled non-blocking; arrival order does not matter.

## View

| Field | Value |
|-------|-------|
| kind | andGate |
| bg | #e3f2fd |
| border | #1565c0 |
| text | #0d47a1 |
| accent | #1565c0 |
| minWidth | 70 |
| defaultLabel | andGate |

## Runtime status

- Loader-registered: yes
- TSX render: present
