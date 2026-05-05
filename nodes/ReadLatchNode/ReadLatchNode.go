// Phase 7 follow-up — ReadLatch on the Go side.
//
// Mirrors the TS handler in src/sim/handlers.ts (latchHandlers):
//   on `in`     : buffer value (held = value, hasHeld = true). No emit.
//   on `release`: if hasHeld, emit out=held + ack=1, clear. Otherwise
//                 noEmit (recv recorded, no fire/sends).
//
// Channel layout matches ChainInhibitorNode's two-output convention:
// `out` carries the held value; `ack` signals consumption.

package ReadLatchNode

import (
	S "github.com/dtauraso/wirefold/nodes/SafeWorker"
)

type ReadLatchNode struct {
	Id          int
	Name        string
	FromIn      <-chan int
	FromRelease <-chan int
	ToNext      chan<- int
	ToAck       chan<- int

	held    int
	hasHeld bool
}

func (n *ReadLatchNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		select {
		case v := <-n.FromIn:
			s.Trace.Recv(n.Name, "in", v)
			n.held = v
			n.hasHeld = true
		case r := <-n.FromRelease:
			s.Trace.Recv(n.Name, "release", r)
			if !n.hasHeld {
				continue
			}
			s.Trace.Fire(n.Name)
			S.Send(n.ToNext, n.held)
			s.Trace.Send(n.Name, "out", n.held)
			S.Send(n.ToAck, 1)
			s.Trace.Send(n.Name, "ack", 1)
			n.held = 0
			n.hasHeld = false
		case <-s.Ctx.Done():
			return
		}
	}
}
