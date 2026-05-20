# PartitionNode

## Ports

| Name | Direction | Element type | Cardinality | TSX handle | Side |
|------|-----------|--------------|-------------|------------|------|
| FromIn | in | int | single | FromIn | left |
| ToOut | out | int | single | ToOut | right |

## Firing rule

State machine with three states: NotInitialized (0), Growing (1), Stopped (2).

Block until a value arrives on FromIn. On each arrival:

- If value ≠ 1: silently absorb (no fire, no emit). State unchanged.
- If value == 1 AND state == NotInitialized: transition to Growing; emit 1 on ToOut.
- If value == 1 AND state == Growing: transition to Stopped; emit 0 on ToOut.
- If value == 1 AND state == Stopped: silently absorb.

## Runtime status

- Loader-registered: yes
- TSX render: present
