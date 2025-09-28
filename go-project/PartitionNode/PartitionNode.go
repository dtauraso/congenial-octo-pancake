package PartitionNode

import (
	"context"
	"fmt"
	"sync"
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

func (pn *PartitionNode) Update(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()
	for {
		fmt.Printf("%dPN is being run\n", pn.Id)
		select {
		case <-ctx.Done():
			return
			// Additional cases can be added here to react to Start/Tracker/End messages
		}
	}
}
