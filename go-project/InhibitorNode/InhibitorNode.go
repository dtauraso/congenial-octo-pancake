package InhibitorNode

import (
	"fmt"

	EDN "github.com/dtauraso/congenial-octo-pancake/go-project/EdgeNode"
	EN "github.com/dtauraso/congenial-octo-pancake/go-project/ExcitatoryNode"
	PN "github.com/dtauraso/congenial-octo-pancake/go-project/PartitionNode"
	S "github.com/dtauraso/congenial-octo-pancake/go-project/SafeWorker"
)

type InhibitorNode struct {
	Id                           int
	PartitionIsMadeFromPartition <-chan bool
	FromExcitatory               <-chan int
	ToExcitatory                 chan<- int
	LinkToExcitatory             *EN.ExcitatoryNode
	FromPrevInhibitor            <-chan int
	ToPrevInhibitor              chan<- int
	LinkToPrevInhibitor          *InhibitorNode
	FromNextInhibitor            <-chan int
	ToNextInhibitor              chan<- int
	LinkToNextInhibitor          *InhibitorNode
	ToEdgeNode                   chan<- int
	FromEdgeNode                 <-chan int
	LinkToEdgeNode               *EDN.EdgeNode
	StartFromPartition           <-chan int
	StartToPartition             chan<- int
	TrackerFromPartition         <-chan int
	TrackerToPartition           chan<- int
	EndFromPartition             <-chan int
	EndToPartition               chan<- int
	LinkToPartitinNode           *PN.PartitionNode
	IsNewParitionSpawned         bool

	TransferTrackerChannelFromCurrentInhibitorToNextInhibitor      chan<- chan<- int
	TransferEndPartitionChannelFromCurrentInhibitorToNextInhibitor chan<- chan<- int

	TransferTrackerChannelFromPrevInhibitorToCurrentInhibitor      <-chan chan<- int
	TransferEndPartitionChannelFromPrevInhibitorToCurrentInhibitor <-chan chan<- int
}

var grow int = 1

func (in *InhibitorNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		select {
		case value := <-in.FromExcitatory:
			fmt.Printf("%dI1: %d\n", in.Id, value)
			switch value {
			case 0:
				S.Send(s, in.ToEdgeNode, 0)
			case 1:
				S.Send(s, in.ToEdgeNode, 1)
				fmt.Printf("second inhibitor\n")
				select {
				case end := <-in.TransferEndPartitionChannelFromPrevInhibitorToCurrentInhibitor:
					fmt.Printf("%dI: received end partition transfer with tracker type %T from previous inhibitor\n", in.Id, end)
					in.EndToPartition = end
					fmt.Printf("%dI: set end partition channel after transfer from previous inhibitor\n", in.Id)
				default:
				}

				select {
				case tracker := <-in.TransferTrackerChannelFromPrevInhibitorToCurrentInhibitor:
					fmt.Printf("%dI: received tracker channel transfer with tracker type %T from previous inhibitor\n", in.Id, tracker)
					in.TrackerToPartition = tracker
					fmt.Printf("%dI: set tracker channel after transfer from previous inhibitor\n", in.Id)
				default:
				}

			case 2:
				S.Send(s, in.ToExcitatory, -1)
				S.Send(s, in.ToNextInhibitor, 1)
				select {
				case message := <-in.EndFromPartition:
					switch message {
					case grow:
						S.Send(s, in.TransferEndPartitionChannelFromCurrentInhibitorToNextInhibitor, in.EndToPartition)
						fmt.Printf("%dI: sent end partition transfer with tracker type %T to next inhibitor\n", in.Id, in.EndToPartition)
						in.EndToPartition = nil
						fmt.Printf("%dI: cleared end partition channel after transfer to next inhibitor\n", in.Id)
					}
				}

				S.Send(s, in.TransferTrackerChannelFromCurrentInhibitorToNextInhibitor, in.TrackerToPartition)
				fmt.Printf("%dI: sent tracker channel transfer with tracker type %T to next inhibitor\n", in.Id, in.TrackerToPartition)
				in.TrackerToPartition = nil
				fmt.Printf("%dI: cleared tracker channel after transfer to next inhibitor\n", in.Id)

			}
		default:
		}

		select {
		case value := <-in.FromPrevInhibitor:
			fmt.Printf("%dI2: %d\n", in.Id, value)
			switch value {
			case 1:
				S.Send(s, in.ToExcitatory, 1)
			}
		default:
		}

		select {
		case value := <-in.FromEdgeNode:
			fmt.Printf("%dEdI: edge result: %d\n", in.Id, value)
		default:
		}
	}

}

func Run2() {
	fmt.Println("Process2 started")
}
