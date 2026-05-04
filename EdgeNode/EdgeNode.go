// Phase 8 Chunk 8 — EdgeNode on the Go side.
//
// Mirrors the TS handler in src/sim/handlers.ts (edgeJoin):
//   buffer one input on `left` or `right`; when both buffered, emit
//   xor = left ^ right identically on three outputs (current
//   inhibitor, partition, next edge) and clear. Trace emits recv per
//   arrival, fire+three sends on the second arrival that completes
//   the join.
//
// Patterned on AndGateNode/SyncGateNode: non-blocking polled selects
// on each input, S.Send for outputs. The previous version had a
// FromPrevEdge channel that was drained but never used; dropped here
// to match the TS contract (re-add when it gains meaning).

package EdgeNode

import (
	S "github.com/dtauraso/wirefold/SafeWorker"
)

type EdgeNode struct {
	Id              int
	Name            string
	FromLeft        <-chan int
	FromRight       <-chan int
	ToInhibitor     chan<- int
	ToPartition     chan<- int
	ToNextEdge      chan<- int

	left, right       int
	hasLeft, hasRight bool
}

func (e *EdgeNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		if !e.hasLeft {
			select {
			case v := <-e.FromLeft:
				e.left = v
				e.hasLeft = true
				s.Trace.Recv(e.Name, "left", v)
			default:
			}
		}

		if !e.hasRight {
			select {
			case v := <-e.FromRight:
				e.right = v
				e.hasRight = true
				s.Trace.Recv(e.Name, "right", v)
			default:
			}
		}

		if e.hasLeft && e.hasRight {
			xor := e.left ^ e.right
			s.Trace.Fire(e.Name)
			S.Send(e.ToInhibitor, xor)
			s.Trace.Send(e.Name, "outInhibitor", xor)
			S.Send(e.ToPartition, xor)
			s.Trace.Send(e.Name, "outPartition", xor)
			S.Send(e.ToNextEdge, xor)
			s.Trace.Send(e.Name, "outNextEdge", xor)
			e.hasLeft = false
			e.hasRight = false
		}
	}
}
