package ChainInhibitorNode

import (
	"fmt"

	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
)

type ChainInhibitorNode struct {
	Id        int
	HeldValue int
	FromPrev  <-chan int
	ToNext    chan<- int
	ToEdge    []chan<- int
}

func NewChainInhibitorNode(id int, fromPrev <-chan int, toNext chan<- int) ChainInhibitorNode {
	return ChainInhibitorNode{Id: id, HeldValue: 0, FromPrev: fromPrev, ToNext: toNext}
}

func (in *ChainInhibitorNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	// Send initial edge values to bootstrap detectors
	for _, ch := range in.ToEdge {
		S.Send(ch, in.HeldValue)
	}
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		select {
		case value := <-in.FromPrev:
			fmt.Printf("%dCI: received %d from prev\n", in.Id, value)
			for _, ch := range in.ToEdge {
				S.Send(ch, in.HeldValue)
			}
			S.Send(in.ToNext, in.HeldValue)
			in.HeldValue = value
		default:
		}
	}
}
