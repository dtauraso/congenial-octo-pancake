# InputNode

## Ports

| Name | Direction | Element type | Cardinality | TSX handle | Side |
|------|-----------|--------------|-------------|------------|------|
| ToNext | out | int | single | ToOut | right |

## Firing rule

On each Update call: iterate through `Init` slice by index. For each value, attempt a non-blocking send on ToNext. On success, advance the index. Exits when all values have been sent or context is cancelled.

## View

| Field | Value |
|-------|-------|
| kind | input |
| bg | #1a1f2e |
| border | #3fb950 |
| text | #c9d1d9 |
| accent | #3fb950 |
| minWidth | 90 |
| displays | queue, repeat |
| defaultLabel | input |

## Runtime status

- Loader-registered: yes
- TSX render: present

## Open questions

- TSX handle id is `ToOut`; Go struct field is `ToNext`. These should be reconciled (handle id should match field name per the post-fix-5 convention).
