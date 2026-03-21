package LatchNode

import (
	"fmt"
	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
)

type LatchNode struct {
	Id      int
	Value   int
	HasVal  bool
	FromIn  <-chan int
	ToOut   chan<- int
	Release <-chan int
	ToAck   chan<- int
}

func (l *LatchNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		if !l.HasVal {
			select {
			case v := <-l.FromIn:
				l.Value = v
				l.HasVal = true
				fmt.Printf("latch%d: latched %d\n", l.Id, l.Value)
			default:
			}
		}

		if l.HasVal {
			select {
			case <-l.Release:
				fmt.Printf("latch%d: releasing %d\n", l.Id, l.Value)
				S.Send(l.ToOut, l.Value)
				S.Send(l.ToAck, 1)
				l.HasVal = false
			default:
			}
		}
	}
}
