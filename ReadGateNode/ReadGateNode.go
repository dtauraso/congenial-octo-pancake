package ReadGateNode

import (
	"fmt"
	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
)

type ReadGateNode struct {
	Id        int
	ReadyVal  int
	HasReady  bool
	AckVal    int
	HasAck    bool
	FromReady <-chan int
	FromAck   <-chan int
	ToRelease chan<- int
}

func (g *ReadGateNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		select {
		case v := <-g.FromReady:
			g.ReadyVal = v
			g.HasReady = true
		default:
		}

		select {
		case v := <-g.FromAck:
			g.AckVal = v
			g.HasAck = true
		default:
		}

		if g.HasReady && g.HasAck {
			result := g.ReadyVal & g.AckVal
			fmt.Printf("readGate%d: ready=%d AND ack=%d = %d\n", g.Id, g.ReadyVal, g.AckVal, result)
			S.Send(g.ToRelease, result)
			g.HasReady = false
			g.HasAck = false
		}
	}
}
