# StreakBreakDetector

## Ports

| Name | Direction | Element type | Cardinality | TSX handle | Side |
|------|-----------|--------------|-------------|------------|------|
| FromOld | in | int | single | FromOld | left |
| FromNew | in | int | single | FromNew | left |
| ToDone | out | int | single | ToDone | right |

## Firing rule

Buffer one value from each input independently. When both FromOld and FromNew have been received, fire:

- sign(v) = positive if v ≥ 1, else non-positive.
- broke = 1 if sign(old) ≠ sign(new), else broke = 0.
- Emit broke on ToDone.
- Clear both buffers.

Detects a sign change between two consecutive edge values. Emits 1 when the streak is broken (sign changed), 0 when the streak continues.

## View

| Field | Value |
|-------|-------|
| kind | streakBreakDetector |
| bg | #ffebee |
| border | #c62828 |
| text | #b71c1c |
| accent | #c62828 |
| minWidth | 110 |
| defaultLabel | streakBreakDetector |

## Runtime status

- Loader-registered: yes
- TSX render: missing
