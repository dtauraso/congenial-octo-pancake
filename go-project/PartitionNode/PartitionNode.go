package PartitionNode

import (
	"fmt"
	S "github.com/dtauraso/congenial-octo-pancake/go-project/SafeWorker"
)

type PartitionNode struct {
	Id                   int
	PartitionIsMade      <-chan bool
	StopGrowingFromEdge  <-chan int
	StartFromInhibitor   <-chan int
	StartToInhibitor     chan<- int
	EndFromInhibitor     <-chan int
	EndToInhibitor       chan<- int
}

func (pn *PartitionNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	growing := true
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		select {
		case <-pn.StopGrowingFromEdge:
			growing = false
			fmt.Printf("p%d: stop growing\n", pn.Id)
		default:
		}

		if growing {
			S.Send(pn.EndToInhibitor, S.Grow)
		}
	}
}
