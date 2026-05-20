package ChainInhibitorNode

import "github.com/dtauraso/wirefold/nodes/Wiring"

func populateChainInhibitor(id int, name string, data *Wiring.NodeData, node any) {
	n := node.(*ChainInhibitorNode)
	if data != nil {
		if v, ok := data.InitialSlots["held"]; ok {
			n.HeldValue = v
		}
	}
	if len(n.ToEdge) == 0 {
		n.ToEdge = []chan<- int{make(chan int, 1)}
	}
}

func init() {
	Wiring.Register("ChainInhibitor", func() any { return &ChainInhibitorNode{} }, populateChainInhibitor)
}
