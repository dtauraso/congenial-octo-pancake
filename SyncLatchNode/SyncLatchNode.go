package SyncLatchNode

import (
	"fmt"
	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
)

type SyncLatchNode struct {
	Id      int
	Value   int
	HasVal  bool
	FromChain <-chan int
	ToChain   chan<- int
	Release   <-chan int
	ToAck     chan<- int
}

func (l *SyncLatchNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		if !l.HasVal {
			select {
			case v := <-l.FromChain:
				l.Value = v
				l.HasVal = true
				fmt.Printf("detectorLatch%d: latched %d\n", l.Id, l.Value)
			default:
			}
		}

		if l.HasVal {
			select {
			case <-l.Release:
				fmt.Printf("detectorLatch%d: releasing %d\n", l.Id, l.Value)
				S.Send(l.ToChain, l.Value)
				S.Send(l.ToAck, 1)
				l.HasVal = false
			default:
			}
		}
	}
}
