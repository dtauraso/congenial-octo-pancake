package InhibitorNode

import (
	"fmt"

	S "github.com/dtauraso/wirefold/SafeWorker"
)

type InhibitorNode struct {
	Id                int
	HeldValue         int
	HasValue          bool
	FromPrevInhibitor <-chan int
	ToNextInhibitor   chan<- int
	ToEdgeNode        chan<- int
	FromEdgeNode      <-chan int
	ToRecognitionAndGate         chan<- int
	EndFromPartition  <-chan int
	EndToPartition    chan<- int

	TransferEndPartitionChannelFromCurrentInhibitorToNextInhibitor chan<- chan<- int

	TransferEndPartitionChannelFromPrevInhibitorToCurrentInhibitor <-chan chan<- int
}

func (in *InhibitorNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		select {
		case value := <-in.FromPrevInhibitor:
			fmt.Printf("%dI: received %d from prev\n", in.Id, value)

			select {
			case end := <-in.TransferEndPartitionChannelFromPrevInhibitorToCurrentInhibitor:
				fmt.Printf("%dI: received end partition transfer from prev\n", in.Id)
				in.EndToPartition = end
			default:
			}

			if in.HasValue {
				fmt.Printf("%dI: pushing %d to next\n", in.Id, in.HeldValue)
				S.Send(in.ToEdgeNode, in.HeldValue)
				S.Send(in.ToNextInhibitor, in.HeldValue)

				select {
				case value := <-in.FromEdgeNode:
					fmt.Printf("%dI: edge result: %d\n", in.Id, value)
				default:
				}
			}

			in.HeldValue = value
			in.HasValue = true
			S.Send(in.ToRecognitionAndGate, value)

			if in.TransferEndPartitionChannelFromCurrentInhibitorToNextInhibitor != nil && in.EndToPartition != nil {
				S.Send(in.TransferEndPartitionChannelFromCurrentInhibitorToNextInhibitor, in.EndToPartition)
				fmt.Printf("%dI: sent end partition transfer to next\n", in.Id)
				in.EndToPartition = nil
			}
		default:
		}
	}
}
