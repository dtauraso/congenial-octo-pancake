# ReadGateNode

## Ports

| Name | Direction | Element type | Cardinality | TSX handle | Side |
|------|-----------|--------------|-------------|------------|------|
| FromInput | in | int | single | FromInput | left |
| FromChainInhibitor | in | int | single | FromChainInhibitor | left |
| ToChainInhibitor | out | int | single | ToChainInhibitor | right |

## Firing rule

Buffer one value from each input independently. When both FromInput and FromChainInhibitor have been received, fire:

- Emit the buffered value from FromInput on ToChainInhibitor.
- Clear both buffers.

The chain-inhibitor signal gates passage of the value; its own value is not used — only its arrival matters. The signal carries the held int emitted by ChainInhibitor's ToNext fanout (not a constant).

## View

| Field | Value |
|-------|-------|
| kind | readGate |
| bg | #f3e5f5 |
| border | #7b1fa2 |
| text | #4a148c |
| accent | #7b1fa2 |
| minWidth | 70 |
| sublabel | val / inhibitor |
| defaultLabel | readgate |

## Runtime status

- Loader-registered: yes
- TSX render: present
