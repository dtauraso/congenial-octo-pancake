package ReadGateNode

import (
	"fmt"
	S "github.com/dtauraso/wirefold/nodes/SafeWorker"
	"github.com/dtauraso/wirefold/nodes/Wiring"
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
	ToGated   chan<- int
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
				s.Trace.Recv(g.Name, "FromValue", v)
			default:
			}
		}

		if !g.HasAck {
			select {
			case v := <-g.FromAck:
				g.AckVal = v
				g.HasAck = true
				s.Trace.Recv(g.Name, "FromAck", v)
			default:
			}
		}

		if g.HasValue && g.HasAck {
			fmt.Printf("%s: value=%d ack=%d → %d\n", g.Name, g.Value, g.AckVal, g.Value)
			s.Trace.Fire(g.Name)
			S.Send(g.ToGated, g.Value)
			s.Trace.Send(g.Name, "ToGated", g.Value)
			g.HasValue = false
			g.HasAck = false
		}
	}
}

func init() {
	Wiring.Register("ReadGate", func() any { return &ReadGateNode{} }, nil)
}
