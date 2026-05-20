package ChainInhibitorNode

import (
	"fmt"

	S "github.com/dtauraso/wirefold/nodes/SafeWorker"
	"github.com/dtauraso/wirefold/nodes/Wiring"
)

type ChainInhibitorNode struct {
	Id         int
	Name       string
	HeldValue  int
	FromPrev   <-chan int
	ToNext     chan<- int
	ToAck      chan<- int
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
			s.Trace.Recv(in.Name, "FromPrev", value)
			fmt.Printf("%s: received %d (old=%d)\n", in.Name, value, in.HeldValue)
			s.Trace.Fire(in.Name)
			for _, ch := range in.ToEdge {
				S.Send(ch, in.HeldValue)
				s.Trace.Send(in.Name, "ToEdge", in.HeldValue)
			}
			for _, ch := range in.ToEdgeNew {
				S.Send(ch, value)
				s.Trace.Send(in.Name, "readNew", value)
			}
			S.Send(in.ToNext, in.HeldValue)
			s.Trace.Send(in.Name, "ToNext", in.HeldValue)
			in.HeldValue = value
			S.Send(in.ToAck, 1)
			s.Trace.Send(in.Name, "ack", 1)
		default:
		}
	}
}

func populateChainInhibitor(id int, name string, data *Wiring.NodeData, node any) {
	n := node.(*ChainInhibitorNode)
	if data != nil {
		if v, ok := data.InitialSlots["held"]; ok {
			n.HeldValue = v
		}
	}
	if len(n.ToEdge) == 0 {
		n.ToEdge = []chan<- int{make(chan int, 1)}
	}
}

func init() {
	Wiring.Register("ChainInhibitor", func() any { return &ChainInhibitorNode{} }, populateChainInhibitor)
}
