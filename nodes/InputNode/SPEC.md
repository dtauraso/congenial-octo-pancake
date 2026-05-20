# InputNode

## Ports

| Name | Direction | Element type | Cardinality | TSX handle | Side |
|------|-----------|--------------|-------------|------------|------|
| ToNext | out | int | single | ToOut | right |

## Loader-managed channels

| Name | Element type | Source |
|------|--------------|--------|
| Input | int | `data.init: []int` (pre-filled at load time; not wirable) |

## Firing rule

On each cycle: if no value is buffered, poll Input non-blocking. If a value is received, buffer it. If a value is buffered and has not yet been sent, attempt a non-blocking send on ToNext. On success, clear the buffer.

Each value from the `data.init` queue is forwarded once to ToNext in order.

## Runtime status

- Loader-registered: yes
- TSX render: present

## Open questions

- TSX handle id is `ToOut`; Go struct field is `ToNext`. These should be reconciled (handle id should match field name per the post-fix-5 convention).
