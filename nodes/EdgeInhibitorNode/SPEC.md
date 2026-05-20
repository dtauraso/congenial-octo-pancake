# EdgeInhibitorNode

## Ports

| Name | Direction | Element type | Cardinality | TSX handle | Side |
|------|-----------|--------------|-------------|------------|------|
| FromPrev | in | int | single | FromPrev | left |
| ToEdge | out | int | single | ToEdge | right |

## Firing rule

Block until a value arrives on FromPrev. On each arrival, immediately forward the value to ToEdge. No buffering; arrival triggers emission directly.

## Runtime status

- Loader-registered: yes
- TSX render: present
