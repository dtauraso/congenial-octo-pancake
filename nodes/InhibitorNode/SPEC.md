# InhibitorNode

## Ports

| Name | Direction | Element type | Cardinality | TSX handle | Side |
|------|-----------|--------------|-------------|------------|------|
| FromPrevInhibitor | in | int | single | FromPrevInhibitor | left |
| FromEdgeNode | in | int | single | FromEdgeNode | left |
| ToNextInhibitor | out | int | single | ToNextInhibitor | right |
| ToEdgeNode | out | int | single | ToEdgeNode | right |
| ToRecognitionAndGate | out | int | single | ToRecognitionAndGate | right |

## Non-channel fields

The following chan-of-chan fields are created by the loader's `populate` func (not wirable via topology edges):

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| TransferEndPartitionChannelFromCurrentInhibitorToNextInhibitor | chan int | loader populate | Created as `make(chan chan<- int, 1)` at load time |
| TransferEndPartitionChannelFromPrevInhibitorToCurrentInhibitor | chan int | loader populate | Created as `make(chan chan<- int, 1)` at load time |
| EndToPartition | — | received at runtime via transfer channel | Dynamically assigned when a partition-end channel is forwarded |

## Firing rule

Block until a value arrives on FromPrevInhibitor. On each arrival:

1. Non-blocking check of `TransferEndPartitionChannelFromPrevInhibitorToCurrentInhibitor`: if a partition-end channel is available, store it as `EndToPartition`.
2. If `HasValue` (a previous value has been held):
   a. Emit HeldValue on ToEdgeNode.
   b. Emit HeldValue on ToNextInhibitor.
   c. Non-blocking drain of FromEdgeNode (edge result is consumed but not used).
3. Store incoming value as HeldValue; mark HasValue = true.
4. Emit HeldValue on ToRecognitionAndGate.
5. If `TransferEndPartitionChannelFromCurrentInhibitorToNextInhibitor` is set and `EndToPartition` is not nil, forward EndToPartition on the transfer-out channel and clear EndToPartition.

## View

| Field | Value |
|-------|-------|
| kind | inhibitor |
| bg | #fff3e0 |
| border | #e65100 |
| text | #bf360c |
| accent | #e65100 |
| minWidth | 90 |
| defaultLabel | inhibitor |

## Runtime status

- Loader-registered: yes
- TSX render: present
