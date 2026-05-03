// Phase 8 Chunk 5 — SyncGate on the Go side.
//
// Mirrors the TS handler in src/sim/handlers.ts (syncGateJoin):
//   buffer one input on `a` or `b`; when both buffered, emit
//   release=1 and clear. Same shape as AndGate but the output port
//   is `release` and the value is always 1 regardless of inputs
//   (SyncGate fires the latch downstream once both detectors agree
//   that processing is done).

package SyncGateNode

import (
	S "github.com/dtauraso/wirefold/SafeWorker"
)

type SyncGateNode struct {
	Id        int
	Name      string
	FromA     <-chan int
	FromB     <-chan int
	ToRelease chan<- int

	a, b       int
	hasA, hasB bool
}

func (g *SyncGateNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		if !g.hasA {
			select {
			case v := <-g.FromA:
				g.a = v
				g.hasA = true
				s.Trace.Recv(g.Name, "a", v)
			default:
			}
		}

		if !g.hasB {
			select {
			case v := <-g.FromB:
				g.b = v
				g.hasB = true
				s.Trace.Recv(g.Name, "b", v)
			default:
			}
		}

		if g.hasA && g.hasB {
			s.Trace.Fire(g.Name)
			S.Send(g.ToRelease, 1)
			s.Trace.Send(g.Name, "release", 1)
			g.hasA = false
			g.hasB = false
		}
	}
}
