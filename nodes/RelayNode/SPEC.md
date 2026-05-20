# RelayNode

## Ports

| Name | Direction | Element type | Cardinality | TSX handle | Side | Accent |
|------|-----------|--------------|-------------|------------|------|--------|
| FromIn | in | int | single | FromIn | left | |
| ToOut | out | int | single | ToOut | right | |

## Firing rule

Buffer one value from FromIn. When a value has been received, emit it on ToOut and clear the buffer. Pass-through: every value received on FromIn is forwarded once to ToOut.

## View

| Field | Value |
|-------|-------|
| kind | relay |
| bg | #e8f5e9 |
| border | #2e7d32 |
| text | #1b5e20 |
| accent | #2e7d32 |
| minWidth | 70 |
| defaultLabel | relay |

## Runtime status

- Loader-registered: no
- TSX render: present
