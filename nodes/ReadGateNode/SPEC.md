# ReadGateNode

## Ports

| Name | Direction | Element type | Cardinality | TSX handle | Side |
|------|-----------|--------------|-------------|------------|------|
| FromValue | in | int | single | FromValue | left |
| FromAck | in | int | single | FromAck | left |
| ToGated | out | int | single | ToGated | right |

## Firing rule

Buffer one value from each input independently. When both FromValue and FromAck have been received, fire:

- Emit the buffered value from FromValue on ToGated.
- Clear both buffers.

The ack signal gates passage of the value; the ack's own value is not used — only its arrival matters.

## Runtime status

- Loader-registered: yes
- TSX render: present
