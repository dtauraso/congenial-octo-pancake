package InputNode

import (
	S "github.com/dtauraso/wirefold/nodes/SafeWorker"
	"github.com/dtauraso/wirefold/nodes/Wiring"
)

type InputNode struct {
	Id     int
	Name   string
	Init   []int
	ToNext chan<- int
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
		case n.ToNext <- n.Init[i]:
			s.Trace.Fire(n.Name)
			s.Trace.Send(n.Name, "ToOut", n.Init[i])
			i++
		default:
		}
	}
}

func populateInput(id int, name string, data *Wiring.NodeData, node any) {
	n := node.(*InputNode)
	if data != nil {
		n.Init = append([]int(nil), data.Init...)
	}
}

func init() {
	Wiring.Register("Input", func() any { return &InputNode{} }, populateInput)
}
