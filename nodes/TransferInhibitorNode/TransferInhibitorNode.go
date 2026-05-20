package TransferInhibitorNode

import (
	"fmt"

	S "github.com/dtauraso/wirefold/nodes/SafeWorker"
	"github.com/dtauraso/wirefold/nodes/Wiring"
)

type TransferInhibitorNode struct {
	Id          int
	EndTo       chan<- int
	TransferIn  <-chan chan<- int
	TransferOut chan<- chan<- int
}

func (in *TransferInhibitorNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		select {
		case end := <-in.TransferIn:
			fmt.Printf("%dTI: received end partition transfer from prev\n", in.Id)
			in.EndTo = end

			if in.TransferOut != nil {
				S.Send(in.TransferOut, in.EndTo)
				fmt.Printf("%dTI: sent end partition transfer to next\n", in.Id)
				in.EndTo = nil
			}
		default:
		}
	}
}

func populateTransferInhibitor(id int, name string, data *Wiring.NodeData, node any) {
	n := node.(*TransferInhibitorNode)
	rcv := make(chan chan<- int, 1)
	n.TransferIn = rcv
	n.TransferOut = make(chan chan<- int, 1)
}

func init() {
	Wiring.Register("TransferInhibitor", func() any { return &TransferInhibitorNode{} }, populateTransferInhibitor)
}
