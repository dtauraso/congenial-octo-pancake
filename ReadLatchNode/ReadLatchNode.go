package ReadLatchNode

import (
	"fmt"
	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
)

type ReadLatchNode struct {
	Id      int
	Value   int
	HasVal  bool
	FromInput <-chan int
	ToChain   chan<- int
	Release   <-chan int
}

func (l *ReadLatchNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		if !l.HasVal {
			select {
			case v := <-l.FromInput:
				l.Value = v
				l.HasVal = true
				fmt.Printf("readLatch%d: latched %d\n", l.Id, l.Value)
			default:
			}
		}

		if l.HasVal {
			select {
			case <-l.Release:
				fmt.Printf("readLatch%d: releasing %d\n", l.Id, l.Value)
				S.Send(l.ToChain, l.Value)
				l.HasVal = false
			default:
			}
		}
	}
}
