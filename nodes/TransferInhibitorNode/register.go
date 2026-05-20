package TransferInhibitorNode

import "github.com/dtauraso/wirefold/nodes/Wiring"

func populateTransferInhibitor(id int, name string, data *Wiring.NodeData, node any) {
	n := node.(*TransferInhibitorNode)
	rcv := make(chan chan<- int, 1)
	n.TransferIn = rcv
	n.TransferOut = make(chan chan<- int, 1)
}

func init() {
	Wiring.Register("TransferInhibitor", func() any { return &TransferInhibitorNode{} }, populateTransferInhibitor)
}
