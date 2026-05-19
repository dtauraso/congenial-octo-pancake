package TransferInhibitorNode

import (
	"fmt"

	S "github.com/dtauraso/wirefold/nodes/SafeWorker"
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
