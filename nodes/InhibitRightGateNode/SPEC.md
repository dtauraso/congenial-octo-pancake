# InhibitRightGateNode

## Ports

| Name | Direction | Element type | Cardinality | TSX handle | Side |
|------|-----------|--------------|-------------|------------|------|
| FromLeft | in | int | single | FromLeft | left |
| FromRight | in | int | single | FromRight | left |
| ToPassed | out | int | single | ToPassed | right |

## Firing rule

Buffer one value from each input independently. When both FromLeft and FromRight have been received, fire:

- result = 1 if (left == 1 AND right == 0), else result = 0
- Emit result on ToPassed.
- Clear both buffers.

Semantics: the left signal passes through only when the right (inhibitory) signal is absent (0). If the right signal is present (1), the left signal is suppressed.

## Runtime status

- Loader-registered: yes
- TSX render: present
