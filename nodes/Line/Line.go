package Line

import (
	CI "github.com/dtauraso/wirefold/nodes/ChainInhibitorNode"
	IRG "github.com/dtauraso/wirefold/nodes/InhibitRightGateNode"
	INN "github.com/dtauraso/wirefold/nodes/InputNode"
	RGN "github.com/dtauraso/wirefold/nodes/ReadGateNode"
	S "github.com/dtauraso/wirefold/nodes/SafeWorker"
)

type Line struct {
	Line []S.Node
}

func (l *Line) Setup() {
	// Cascade-copy chain: in0 -> readGate -> i0 -> i1
	// readGate: AND(in0 ready, i1 ack) → forwards value directly to i0
	// i1 acks readGate after receiving → backpressure

	inputNodeToReadGate := make(chan int, 1)
	i1ToReadGate := make(chan int, 1)
	readGateToI0 := make(chan int, 1)
	inputNode := INN.InputNode{Id: 0, Init: []int{0, 1, 0}, ToNext: inputNodeToReadGate}

	// Prime ack so first input flows through
	i1ToReadGate <- 1

	readGate := RGN.ReadGateNode{Id: 0, FromValue: inputNodeToReadGate, FromAck: i1ToReadGate, ToGated: readGateToI0}

	i0ToI1 := make(chan int, 1)
	i0ToInhibitRight0 := make(chan int, 1)
	i0 := CI.NewChainInhibitorNode(0, readGateToI0, i0ToI1)
	i0.ToEdge = []chan<- int{i0ToInhibitRight0}

	i1ToInhibitRight0 := make(chan int, 1)
	i1 := CI.NewChainInhibitorNode(1, i0ToI1, make(chan int, 3))
	i1.ToAck = i1ToReadGate
	i1.ToEdge = []chan<- int{i1ToInhibitRight0}

	inhibitRight0 := IRG.InhibitRightGateNode{Id: 0, FromLeft: i0ToInhibitRight0, FromRight: i1ToInhibitRight0, ToPassed: make(chan int, 1)}

	l.Line = []S.Node{&inputNode, &readGate, &i0, &i1, &inhibitRight0}
}
