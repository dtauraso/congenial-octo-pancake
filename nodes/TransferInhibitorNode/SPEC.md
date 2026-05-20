# TransferInhibitorNode

## Ports

| Name | Direction | Element type | Cardinality | TSX handle | Side |
|------|-----------|--------------|-------------|------------|------|
| EndTo | out | int | single | EndTo | right |

## Non-channel fields

The following chan-of-chan fields are created by the loader's `populate` func (not wirable via topology edges):

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| TransferIn | chan int | loader populate | Created as `make(chan chan<- int, 1)` at load time; receives partition-end channels from the previous node |
| TransferOut | chan int | loader populate | Created as `make(chan chan<- int, 1)` at load time; forwards partition-end channels to the next node |

## Firing rule

Block until a partition-end channel arrives on TransferIn. On receipt:

- Store the received channel as `EndTo`.
- If `TransferOut` is set, immediately forward `EndTo` on TransferOut and clear `EndTo`.

Passes a partition-end channel (`chan<- int`) laterally along the inhibitor chain. The `EndTo` output port (wirable) is the terminal send target once the channel has arrived.

## Runtime status

- Loader-registered: yes
- TSX render: present

## Open questions

- The TSX render only exposes `EndTo` as a source handle. TransferIn and TransferOut are loader-internal and have no visual port representation, which is correct. However, the wiring path for actually using `EndTo` after the transfer arrives is unclear — the port is rendered but the topology wiring convention for chan-of-chan destination is not yet documented.
