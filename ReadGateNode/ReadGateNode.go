package ReadGateNode

import (
	"fmt"
	S "github.com/dtauraso/wirefold/SafeWorker"
)

type ReadGateNode struct {
	Id        int
	Name      string
	Value     int
	HasValue  bool
	AckVal    int
	HasAck    bool
	FromValue <-chan int
	FromAck   <-chan int
	ToLatch   chan<- int
}

func (g *ReadGateNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
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

		if !g.HasAck {
			select {
			case v := <-g.FromAck:
				g.AckVal = v
				g.HasAck = true
			default:
			}
		}

		if g.HasValue && g.HasAck {
			fmt.Printf("%s: value=%d ack=%d → %d\n", g.Name, g.Value, g.AckVal, g.Value)
			S.Send(g.ToLatch, g.Value)
			g.HasValue = false
			g.HasAck = false
		}
	}
}
