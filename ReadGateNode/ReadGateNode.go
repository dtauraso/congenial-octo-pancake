package ReadGateNode

import (
	"fmt"
	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
)

type ReadGateNode struct {
	Id        int
	Value     int
	HasValue  bool
	FromValue <-chan int
	FromAcks  []<-chan int
	HasAcks   []bool
	ToLatch   chan<- int
}

func (g *ReadGateNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	if len(g.HasAcks) != len(g.FromAcks) {
		g.HasAcks = make([]bool, len(g.FromAcks))
	}
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		if !g.HasValue {
			select {
			case v := <-g.FromValue:
				g.Value = v
				g.HasValue = true
			default:
			}
		}

		for i, ch := range g.FromAcks {
			if g.HasAcks[i] {
				continue
			}
			select {
			case <-ch:
				g.HasAcks[i] = true
			default:
			}
		}

		allAcked := true
		for _, h := range g.HasAcks {
			if !h {
				allAcked = false
				break
			}
		}

		if g.HasValue && allAcked {
			fmt.Printf("readGate: value=%d acks=%d → %d\n", g.Value, len(g.FromAcks), g.Value)
			S.Send(g.ToLatch, g.Value)
			g.HasValue = false
			for i := range g.HasAcks {
				g.HasAcks[i] = false
			}
		}
	}
}
