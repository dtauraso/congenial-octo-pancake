package InputNode

import (
	"fmt"

	S "github.com/dtauraso/wirefold/SafeWorker"
)

type InputNode struct {
	Id        int
	Name      string
	Input     <-chan int
	ToNext    chan<- int
	value     int
	hasValue  bool
	sentValue bool
}

func (n *InputNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		if !n.hasValue {
			select {
			case v := <-n.Input:
				n.value = v
				n.hasValue = true
				n.sentValue = false
				s.Trace.Recv(n.Name, "Input", v)
			default:
			}
		}

		if n.hasValue && !n.sentValue {
			select {
			case n.ToNext <- n.value:
				n.sentValue = true
				n.hasValue = false
				fmt.Printf("%s: sent %d\n", n.Name, n.value)
				s.Trace.Fire(n.Name)
				s.Trace.Send(n.Name, "out", n.value)
			default:
			}
		}
	}
}
