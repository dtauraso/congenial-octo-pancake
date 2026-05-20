# EdgeNode

## Ports

| Name | Direction | Element type | Cardinality | TSX handle | Side |
|------|-----------|--------------|-------------|------------|------|
| FromLeft | in | int | single | FromLeft | left |
| FromRight | in | int | single | FromRight | left |
| ToInhibitor | out | int | single | ToInhibitor | right |
| ToPartition | out | int | single | ToPartition | right |
| ToNextEdge | out | int | single | ToNextEdge | right |

## Firing rule

Buffer one value from each input independently. When both FromLeft and FromRight have been received, fire:

- xor = left XOR right
- Emit xor identically on ToInhibitor, ToPartition, and ToNextEdge.
- Clear both buffers.

Each input is polled non-blocking; arrival order does not matter.

## Runtime status

- Loader-registered: yes
- TSX render: present
