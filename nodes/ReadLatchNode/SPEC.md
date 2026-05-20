# ReadLatchNode

## Ports

| Name | Direction | Element type | Cardinality | TSX handle | Side | Accent |
|------|-----------|--------------|-------------|------------|------|--------|
| FromIn | in | int | single | FromIn | left | |
| FromRelease | in | int | single | FromRelease | left | #80cbc4 |
| ToNext | out | int | single | ToNext | right | |
| ToAck | out | int | single | ToAck | right | |

## Firing rule

Two independent input paths; the node waits on whichever arrives first each iteration:

- On FromIn arrival: store value as `held`; mark `hasHeld = true`. No emit.
- On FromRelease arrival:
  - If `hasHeld` is false: silently absorb (no fire, no emit).
  - If `hasHeld` is true: emit `held` on ToNext; emit 1 on ToAck; clear held state.

## View

| Field | Value |
|-------|-------|
| kind | readLatch |
| bg | #e0f7fa |
| border | #00838f |
| text | #006064 |
| accent | #00838f |
| minWidth | 90 |
| sublabel | FromIn / FromRelease |
| defaultLabel | readlatch |

## Runtime status

- Loader-registered: yes
- TSX render: present

## Open questions

- TSX only renders the `ToNext` handle; `ToAck` is absent from the current render.
