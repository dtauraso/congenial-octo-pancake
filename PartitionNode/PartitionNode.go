// Phase 8 Chunk 6 — PartitionNode rewritten to match the TS handler.
//
// Mirrors the partitionIn handler in src/sim/handlers.ts: a state
// machine NotInitialized → Growing → Stopped, advanced only by
// value=1 on `in`. On the NotInit→Growing transition emit out=1; on
// the Growing→Stopped transition emit out=0; other inputs are
// silently absorbed (no fire, no send) — matches TS noEmit.
//
// The previous shape (PartitionIsMade / EndFromInhibitor /
// continuous Grow emission) was speculative and unwired in the
// codebase (`grep -rln PartitionNode --include='*.go'` returned only
// this file). Replacing it directly avoids dragging an obsolete API
// alongside the parity-correct one.

package PartitionNode

import (
	S "github.com/dtauraso/wirefold/SafeWorker"
)

const (
	NotInitialized = 0
	Growing        = 1
	Stopped        = 2
)

type PartitionNode struct {
	Id     int
	Name   string
	State  int
	FromIn <-chan int
	ToOut  chan<- int
}

func (pn *PartitionNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		case v := <-pn.FromIn:
			s.Trace.Recv(pn.Name, "in", v)
			if v != 1 {
				continue
			}
			switch pn.State {
			case NotInitialized:
				pn.State = Growing
				s.Trace.Fire(pn.Name)
				S.Send(pn.ToOut, 1)
				s.Trace.Send(pn.Name, "out", 1)
			case Growing:
				pn.State = Stopped
				s.Trace.Fire(pn.Name)
				S.Send(pn.ToOut, 0)
				s.Trace.Send(pn.Name, "out", 0)
			}
		}
	}
}
