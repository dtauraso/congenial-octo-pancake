package InputNode

import (
	"fmt"
	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
)

type InputNode struct {
	Id        int
	Input     <-chan int
	ToNext    chan<- int
	ToReady   chan<- int
	value     int
	hasValue  bool
	sentValue bool
	sentReady bool
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
				n.sentReady = false
				fmt.Printf("in%d: sending %d\n", n.Id, n.value)
			default:
			}
		}

		if n.hasValue && !n.sentValue {
			select {
			case n.ToNext <- n.value:
				n.sentValue = true
			default:
			}
		}

		if n.hasValue && !n.sentReady {
			select {
			case n.ToReady <- 1:
				n.sentReady = true
			default:
			}
		}

		if n.sentValue && n.sentReady {
			n.hasValue = false
		}
	}
}
