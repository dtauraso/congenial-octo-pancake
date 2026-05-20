package InhibitorNode

import "github.com/dtauraso/wirefold/nodes/Wiring"

func populateInhibitor(id int, name string, data *Wiring.NodeData, node any) {
	n := node.(*InhibitorNode)
	n.TransferEndPartitionChannelFromCurrentInhibitorToNextInhibitor = make(chan chan<- int, 1)
	rcv := make(chan chan<- int, 1)
	n.TransferEndPartitionChannelFromPrevInhibitorToCurrentInhibitor = rcv
}

func init() {
	Wiring.Register("Inhibitor", func() any { return &InhibitorNode{} }, populateInhibitor)
}
