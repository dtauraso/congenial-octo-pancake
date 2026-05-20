package EdgeInhibitorNode

import (
	"fmt"

	S "github.com/dtauraso/wirefold/nodes/SafeWorker"
	"github.com/dtauraso/wirefold/nodes/Wiring"
)

type EdgeInhibitorNode struct {
	Id       int
	FromPrev <-chan int
	ToEdge   chan<- int
}

func (in *EdgeInhibitorNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		select {
		case value := <-in.FromPrev:
			fmt.Printf("%dEI: received %d, sending to edge\n", in.Id, value)
			S.Send(in.ToEdge, value)
		default:
		}
	}
}

func init() {
	Wiring.Register("EdgeInhibitor", func() any { return &EdgeInhibitorNode{} }, nil)
}
