package SyncGateNode

import (
	"fmt"
	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
)

type SyncGateNode struct {
	Id          int
	SbdDoneVal  int
	HasSbdDone  bool
	SdDoneVal   int
	HasSdDone   bool
	FromSbdDone <-chan int
	FromSdDone  <-chan int
	ToRelease   chan<- int
}

func (g *SyncGateNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		select {
		case v := <-g.FromSbdDone:
			g.SbdDoneVal = v
			g.HasSbdDone = true
		default:
		}

		select {
		case v := <-g.FromSdDone:
			g.SdDoneVal = v
			g.HasSdDone = true
		default:
		}

		if g.HasSbdDone && g.HasSdDone {
			result := g.SbdDoneVal & g.SdDoneVal
			fmt.Printf("syncGate%d: sbdDone=%d AND sdDone=%d = %d\n", g.Id, g.SbdDoneVal, g.SdDoneVal, result)
			S.Send(g.ToRelease, result)
			g.HasSbdDone = false
			g.HasSdDone = false
		}
	}
}
