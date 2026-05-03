package InputNode

import (
	"fmt"
	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
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
				fmt.Printf("%s: sending %d\n", n.Name, n.value)
			default:
			}
		}

		if n.hasValue && !n.sentValue {
			select {
			case n.ToNext <- n.value:
				n.sentValue = true
				n.hasValue = false
			default:
			}
		}
	}
}
