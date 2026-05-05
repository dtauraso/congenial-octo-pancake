// Phase 8 Chunk 1 — AndGate on the Go side.
//
// Mirrors the TS handler in src/sim/handlers.ts (andGateJoin):
//   buffer one input on `a` or `b`; when both buffered, emit
//   out = (a==1 && b==1) ? 1 : 0 and clear. Trace emits recv per
//   arrival, fire+send on the second arrival that completes the join.
//
// Patterned on ReadGateNode: non-blocking polled selects on each
// input, S.Send for the output (matches the codebase convention; see
// SafeWorker.Send).

package AndGateNode

import (
	S "github.com/dtauraso/wirefold/nodes/SafeWorker"
)

type AndGateNode struct {
	Id    int
	Name  string
	FromA <-chan int
	FromB <-chan int
	ToOut chan<- int

	a, b       int
	hasA, hasB bool
}

func (g *AndGateNode) Update(s *S.SafeWorker) {
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
			out := 0
			if g.a == 1 && g.b == 1 {
				out = 1
			}
			s.Trace.Fire(g.Name)
			S.Send(g.ToOut, out)
			s.Trace.Send(g.Name, "out", out)
			g.hasA = false
			g.hasB = false
		}
	}
}
