package InhibitorNode

import (
	"fmt"

	S "github.com/dtauraso/congenial-octo-pancake/go-project/SafeWorker"
)

type InhibitorNode struct {
	Id            int
	FromInhibitor     <-chan int
	FromPrevInhibitor <-chan int
	ToNextInhibitor   chan<- int
	ToEdgeNode        chan<- int
	FromEdgeNode      <-chan int
	EndFromPartition <-chan int
	EndToPartition     chan<- int

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
		case value := <-in.FromInhibitor:
			fmt.Printf("%dI: received %d from input\n", in.Id, value)
			S.Send(in.ToEdgeNode, value)
			S.Send(in.ToNextInhibitor, value)

			if in.TransferEndPartitionChannelFromCurrentInhibitorToNextInhibitor != nil && in.EndToPartition != nil {
				S.Send(in.TransferEndPartitionChannelFromCurrentInhibitorToNextInhibitor, in.EndToPartition)
				fmt.Printf("%dI: sent end partition transfer to next\n", in.Id)
				in.EndToPartition = nil
			}
		default:
		}

		select {
		case value := <-in.FromPrevInhibitor:
			fmt.Printf("%dI: received %d from prev inhibitor\n", in.Id, value)

			select {
			case end := <-in.TransferEndPartitionChannelFromPrevInhibitorToCurrentInhibitor:
				fmt.Printf("%dI: received end partition transfer from prev\n", in.Id)
				in.EndToPartition = end
			default:
			}

			S.Send(in.ToEdgeNode, value)
			S.Send(in.ToNextInhibitor, value)

			if in.TransferEndPartitionChannelFromCurrentInhibitorToNextInhibitor != nil && in.EndToPartition != nil {
				S.Send(in.TransferEndPartitionChannelFromCurrentInhibitorToNextInhibitor, in.EndToPartition)
				fmt.Printf("%dI: sent end partition transfer to next\n", in.Id)
				in.EndToPartition = nil
			}
		default:
		}

		select {
		case value := <-in.FromEdgeNode:
			fmt.Printf("%dI: edge result: %d\n", in.Id, value)
		default:
		}
	}
}
