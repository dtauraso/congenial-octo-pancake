package PartitionNode

import (
	"fmt"
	S "github.com/dtauraso/congenial-octo-pancake/go-project/SafeWorker"
)

const (
	NotInitialized = 0
	Growing        = 1
	Stopped        = 2
)

type PartitionNode struct {
	Id               int
	State            int
	PartitionIsMade  <-chan bool
	FromEdge         <-chan int
	EndFromInhibitor <-chan int
	EndToInhibitor   chan<- int
}

func (pn *PartitionNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		select {
		case value := <-pn.FromEdge:
			fmt.Printf("p%d: received %d from edge\n", pn.Id, value)
			switch pn.State {
			case NotInitialized:
				switch value {
				case 1:
					pn.State = Growing
					fmt.Printf("p%d: start growing\n", pn.Id)
				}
			case Growing:
				switch value {
				case 1:
					pn.State = Stopped
					fmt.Printf("p%d: stop growing\n", pn.Id)
				}
			}
		default:
		}

		switch pn.State {
		case Growing:
			S.Send(pn.EndToInhibitor, S.Grow)
		}
	}
}
