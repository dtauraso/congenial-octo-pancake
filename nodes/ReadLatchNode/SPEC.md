# ReadLatchNode

## Ports

| Name | Direction | Element type | Cardinality | TSX handle | Side |
|------|-----------|--------------|-------------|------------|------|
| FromIn | in | int | single | FromIn | left |
| FromRelease | in | int | single | FromRelease | left |
| ToNext | out | int | single | ToNext | right |
| ToAck | out | int | single | ToAck | right |

## Firing rule

Two independent input paths; the node waits on whichever arrives first each iteration:

- On FromIn arrival: store value as `held`; mark `hasHeld = true`. No emit.
- On FromRelease arrival:
  - If `hasHeld` is false: silently absorb (no fire, no emit).
  - If `hasHeld` is true: emit `held` on ToNext; emit 1 on ToAck; clear held state.

## Runtime status

- Loader-registered: yes
- TSX render: present

## Open questions

- TSX only renders the `ToNext` handle; `ToAck` is absent from the current render.
