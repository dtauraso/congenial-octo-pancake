package PartitionNode

import (
	// "fmt"
	S "github.com/dtauraso/congenial-octo-pancake/go-project/SafeWorker"
)

type PartitionNode struct {
	Id              int
	PartitionIsMade <-chan bool
	// Lifespan start handshake: inhibitor -> partition and reply back
	StartFromInhibitor <-chan int
	StartToInhibitor   chan<- int
	// Tracking messages flowing both ways during the partition's lifetime
	TrackerFromInhibitor <-chan int
	TrackerToInhibitor   chan<- int
	// Lifespan end handshake: inhibitor -> partition and reply back
	EndFromInhibitor <-chan int
	EndToInhibitor   chan<- int
}

var grow int = 1

func (pn *PartitionNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}
		S.Send(s, pn.EndToInhibitor, grow)
	}
}
