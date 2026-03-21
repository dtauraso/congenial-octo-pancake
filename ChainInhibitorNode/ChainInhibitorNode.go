package ChainInhibitorNode

import (
	"fmt"

	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
)

type ChainInhibitorNode struct {
	Id         int
	HeldValue  int
	FromPrev   <-chan int
	ToNext     chan<- int
	ToEdge     []chan<- int
	ToEdgeNew  []chan<- int
}

func NewChainInhibitorNode(id int, fromPrev <-chan int, toNext chan<- int) ChainInhibitorNode {
	return ChainInhibitorNode{Id: id, HeldValue: 0, FromPrev: fromPrev, ToNext: toNext}
}

func (in *ChainInhibitorNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		select {
		case value := <-in.FromPrev:
			fmt.Printf("%dCI: received %d (old=%d)\n", in.Id, value, in.HeldValue)
			for _, ch := range in.ToEdge {
				S.Send(ch, in.HeldValue)
			}
			for _, ch := range in.ToEdgeNew {
				S.Send(ch, value)
			}
			S.Send(in.ToNext, in.HeldValue)
			in.HeldValue = value
		default:
		}
	}
}
