package InputNode

import "github.com/dtauraso/wirefold/nodes/Wiring"

func populateInput(id int, name string, data *Wiring.NodeData, node any) {
	n := node.(*InputNode)
	init := []int{}
	if data != nil {
		init = data.Init
	}
	buf := len(init)
	if buf < 1 {
		buf = 1
	}
	ch := make(chan int, buf)
	for _, v := range init {
		ch <- v
	}
	n.Input = ch
}

func init() {
	Wiring.Register("Input", func() any { return &InputNode{} }, populateInput)
}
