package PartitionNode

import (
	S "github.com/dtauraso/congenial-octo-pancake/go-project/SafeWorker"
)

type PartitionNode struct {
	Id                   int
	PartitionIsMade      <-chan bool
	StartFromInhibitor   <-chan int
	StartToInhibitor     chan<- int
	TrackerFromInhibitor <-chan int
	TrackerToInhibitor   chan<- int
	EndFromInhibitor     <-chan int
	EndToInhibitor       chan<- int
}

func (pn *PartitionNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}
		S.Send(pn.EndToInhibitor, S.Grow)
	}
}
