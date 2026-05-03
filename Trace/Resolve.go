// Phase 7 Chunk 4 — raw → canonical trace resolver.
//
// Go nodes emit `send` events keyed by (node, port) because edge IDs
// are spec-level concepts the node doesn't carry. The canonical wire
// format (matching the TS-side simulator output and the chunk-1
// fixture) keys `send` by edge ID. This file bridges the two:
//
//   raw send {node, port, value}  --[Resolve]-->  canonical {edge, value}
//
// recv and fire pass through unchanged. Send events for (node, port)
// pairs that don't correspond to any spec edge — i.e. dead-end output
// channels that Wiring.go creates for unconnected ports — are
// **dropped** by the resolver. This matches the TS simulator's
// behavior (its historyToTrace only emits send events for emissions
// that reach an outgoing edge), so canonical Go traces and canonical
// TS traces describe the same observable channel sends.

package Trace

// EdgeMap looks up an edge ID by its source endpoint. Build via
// BuildEdgeMap from a spec's edge list at trace-resolve time.
// Keyed by `node + "." + port` for cheap string lookup.
type EdgeMap map[string]string

// EdgeLite is the minimum spec data needed to build an EdgeMap:
// edge ID + source node + source port. The full Spec / Edge types
// live in cmd/topogen/main.go and would create an import cycle if
// pulled in here, so callers project their spec into []EdgeLite.
type EdgeLite struct {
	ID           string
	SourceNode   string
	SourceHandle string
}

func BuildEdgeMap(edges []EdgeLite) EdgeMap {
	m := make(EdgeMap, len(edges))
	for _, e := range edges {
		m[e.SourceNode+"."+e.SourceHandle] = e.ID
	}
	return m
}

// Resolve walks raw events and returns the canonical sequence:
//   - recv / fire pass through (Step is reassigned to keep monotonic
//     ordering after dropped sends).
//   - send: if (Node, Port) maps to an edge ID, the event's Edge
//     field is set and the event is kept. If not, the event is
//     dropped (dead-end channel — no edge means no observable send).
//
// The returned slice has fresh Step values 0..N-1.
func Resolve(events []Event, em EdgeMap) []Event {
	out := make([]Event, 0, len(events))
	for _, e := range events {
		switch e.Kind {
		case KindSend:
			edge, ok := em[e.Node+"."+e.Port]
			if !ok {
				continue
			}
			ce := e
			ce.Edge = edge
			out = append(out, ce)
		default:
			out = append(out, e)
		}
	}
	for i := range out {
		out[i].Step = i
	}
	return out
}
