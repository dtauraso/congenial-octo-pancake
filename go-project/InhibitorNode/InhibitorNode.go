package InhibitorNode

import (
	"context"
	"fmt"
	"sync"

	PN "github.com/dtauraso/congenial-octo-pancake/go-project/PartitionNode"
)

type InhibitorNode struct {
	Id                   int
	FromExcitatory       <-chan int
	ToExcitatory         chan<- int
	FromPrevInhibitor    <-chan int
	ToPrevInhibitor      chan<- int
	FromNextInhibitor    <-chan int
	ToNextInhibitor      chan<- int
	ToEdgeNode           chan<- int
	FromEdgeNode         <-chan int
	StartFromPartition   <-chan int
	StartToPartition     chan<- int
	TrackerFromPartition <-chan int
	TrackerToPartition   chan<- int
	EndFromPartition     <-chan int
	EndToPartition       chan<- int
	IsNewParitionSpawned bool

	// Carry partition spawn state and tracker channel to neighbor inhibitor
	TransferToNextInhibitor   chan<- SpawnTransfer
	TransferFromPrevInhibitor <-chan SpawnTransfer
	// Channel-of-channel: allow passing an outbound int channel to the next inhibitor
	MoveToNextInhibitor   chan<- chan<- int
	MoveFromPrevInhibitor <-chan chan<- int
}

// SpawnTransfer is sent from one inhibitor to the next to carry partition state and tracker channel
type SpawnTransfer struct {
	// True once a partition has been created upstream.
	Spawned bool
	// Outbound tracking channel (inhibitor -> partition) to be adopted by the receiver.
	Tracker          chan<- int
	EndFromPartition <-chan int
}

func (in *InhibitorNode) AddPartitionNode(ctx context.Context, wg *sync.WaitGroup) {
	StartFromInhibitorStartFromPartition := make(chan int, 1)
	StartToInhibitorStartToPartition := make(chan int, 1)
	TrackerFromInhibitorTrackerFromPartition := make(chan int, 1)
	TrackerToInhibitorTrackerToPartition := make(chan int, 1)
	EndFromInhibitorEndFromPartition := make(chan int, 1)
	EndToInhibitorEndToPartition := make(chan int, 1)
	wg.Add(1)
	partition_node := PN.PartitionNode{Id: 0,
		StartFromInhibitor:   StartFromInhibitorStartFromPartition,
		StartToInhibitor:     StartToInhibitorStartToPartition,
		TrackerFromInhibitor: TrackerFromInhibitorTrackerFromPartition,
		TrackerToInhibitor:   TrackerToInhibitorTrackerToPartition,
		EndFromInhibitor:     EndFromInhibitorEndFromPartition,
		EndToInhibitor:       EndToInhibitorEndToPartition,
	}
	in.StartFromPartition = StartFromInhibitorStartFromPartition
	in.StartToPartition = StartToInhibitorStartToPartition
	in.TrackerFromPartition = TrackerToInhibitorTrackerToPartition
	in.TrackerToPartition = TrackerFromInhibitorTrackerFromPartition
	in.EndFromPartition = EndFromInhibitorEndFromPartition
	in.EndToPartition = EndToInhibitorEndToPartition
	go partition_node.Update(ctx, wg)
}

func (in *InhibitorNode) Update(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()
	for {
		fmt.Printf("%dI1 is being run\n", in.Id)
		select {
		case <-ctx.Done():
			return
		case value := <-in.FromExcitatory:
			fmt.Printf("%dI1: %d\n", in.Id, value)
			switch value {
			case 0:
				in.ToEdgeNode <- 0
			case 1:
				in.ToEdgeNode <- 1
				if in.FromPrevInhibitor == nil {
					switch {
					case !in.IsNewParitionSpawned:
						in.IsNewParitionSpawned = true
						fmt.Printf("first inhibitor\n")
						in.AddPartitionNode(ctx, wg)
					}
				} else {
					fmt.Printf("second inhibitor\n")
					select {
					case <-ctx.Done():
						return
					case st := <-in.TransferFromPrevInhibitor:
						in.IsNewParitionSpawned = st.Spawned
						in.TrackerToPartition = st.Tracker
						fmt.Printf("%dI: received transfer with tracker type %T from previous inhibitor\n", in.Id, st.Tracker)
					}
				}
			case 2:
				in.ToExcitatory <- -1
				in.ToNextInhibitor <- 1
				EndFromPartition := (<-chan int)(nil)
				if !in.IsNewParitionSpawned {
					EndFromPartition = in.EndFromPartition
				}
				// Send combined spawn info and tracker channel to next inhibitor
				st := SpawnTransfer{
					Spawned:          in.IsNewParitionSpawned,
					Tracker:          in.TrackerToPartition,
					EndFromPartition: EndFromPartition}
				in.TransferToNextInhibitor <- st
				fmt.Printf("%dI: sent transfer with tracker type %T to next inhibitor\n", in.Id, in.TrackerToPartition)
			}
		case value := <-in.FromPrevInhibitor:
			fmt.Printf("%dI2: %d\n", in.Id, value)
			switch value {
			case 1:
				in.ToExcitatory <- 1
			}
		case value := <-in.FromEdgeNode:
			fmt.Printf("%dEdI: edge result: %d\n", in.Id, value)

		}
	}

}

func Run2() {
	fmt.Println("Process2 started")
}
