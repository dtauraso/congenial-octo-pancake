package InputNode

import (
	S "github.com/dtauraso/wirefold/nodes/SafeWorker"
	"github.com/dtauraso/wirefold/nodes/Wiring"
)

type InputNode struct {
	Id     int
	Name   string
	Init   []int        `wire:"data.init"`
	ToReadGate chan<- int
}

func (n *InputNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for i := 0; i < len(n.Init); {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}
		select {
		case n.ToReadGate <- n.Init[i]:
			s.Trace.Fire(n.Name)
			s.Trace.Send(n.Name, "ToReadGate", n.Init[i])
			i++
		default:
		}
	}
}

func init() {
	Wiring.Register("Input", func() any { return &InputNode{} })
}
