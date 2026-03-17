package ChainInhibitorNode

import (
	"fmt"

	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
)

type ChainInhibitorNode struct {
	Id                      int
	HeldValue               int
	FromPrev                <-chan int
	ToCascadeAndGateValue   chan<- int
	ToCascadeAndGateSignal  chan<- int
	ToRecognitionAndGate    chan<- int
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
			fmt.Printf("%dCI: received %d from prev\n", in.Id, value)
			S.Send(in.ToCascadeAndGateValue, in.HeldValue)
			S.Send(in.ToCascadeAndGateSignal, 1)
			in.HeldValue = value
			S.Send(in.ToRecognitionAndGate, in.HeldValue)
		default:
		}
	}
}
