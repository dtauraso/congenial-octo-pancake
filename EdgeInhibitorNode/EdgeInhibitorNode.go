package EdgeInhibitorNode

import (
	"fmt"

	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
)

type EdgeInhibitorNode struct {
	Id       int
	FromPrev <-chan int
	ToEdge   chan<- int
	FromEdge <-chan int
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

			select {
			case result := <-in.FromEdge:
				fmt.Printf("%dEI: edge result: %d\n", in.Id, result)
			default:
			}
		default:
		}
	}
}
