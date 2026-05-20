# StreakDetector

## Ports

| Name | Direction | Element type | Cardinality | TSX handle | Side | Accent |
|------|-----------|--------------|-------------|------------|------|--------|
| FromOld | in | int | single | FromOld | left | |
| FromNew | in | int | single | FromNew | left | |
| ToDone | out | int | single | ToDone | right | |
| ToStreak | out | int | single | ToStreak | right | #66bb6a |

## Firing rule

Buffer one value from each input independently. When both FromOld and FromNew have been received, fire:

- sign(v) = positive if v ≥ 1, else non-positive.
- streak = 1 if sign(old) == sign(new), else streak = 0.
- Emit 1 on ToDone (always).
- Emit streak on ToStreak.
- Clear both buffers.

Detects whether two consecutive edge values share the same sign. ToDone is an unconditional completion signal; ToStreak carries the boolean result.

## View

| Field | Value |
|-------|-------|
| kind | streakDetector |
| bg | #e8f5e9 |
| border | #2e7d32 |
| text | #1b5e20 |
| accent | #2e7d32 |
| minWidth | 100 |
| defaultLabel | streakDetector |

## Runtime status

- Loader-registered: yes
- TSX render: missing
