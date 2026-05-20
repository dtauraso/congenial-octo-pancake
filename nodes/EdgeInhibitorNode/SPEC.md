# EdgeInhibitorNode

## Ports

| Name | Direction | Element type | Cardinality | TSX handle | Side |
|------|-----------|--------------|-------------|------------|------|
| FromPrev | in | int | single | FromPrev | left |
| ToEdge | out | int | single | ToEdge | right |

## Firing rule

Block until a value arrives on FromPrev. On each arrival, immediately forward the value to ToEdge. No buffering; arrival triggers emission directly.

## View

| Field | Value |
|-------|-------|
| kind | edgeInhibitor |
| bg | #fff3e0 |
| border | #ff6f00 |
| text | #e65100 |
| accent | #ff6f00 |
| minWidth | 100 |
| defaultLabel | edgeInhibitor |

## Runtime status

- Loader-registered: yes
- TSX render: present
