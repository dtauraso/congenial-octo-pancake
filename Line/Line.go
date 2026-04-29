package Line

import (
	CI "github.com/dtauraso/congenial-octo-pancake/ChainInhibitorNode"
	IRG "github.com/dtauraso/congenial-octo-pancake/InhibitRightGateNode"
	INN "github.com/dtauraso/congenial-octo-pancake/InputNode"
	RGN "github.com/dtauraso/congenial-octo-pancake/ReadGateNode"
	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
)

type Line struct {
	Line []S.Node
}

func (l *Line) Setup() {
	input := make(chan int, 3)
	input <- 0
	input <- 1
	input <- 0

	// Cascade-copy chain: in0 -> readGate -> i0 -> i1
	// readGate: AND(in0 ready, i1 ack) → forwards value directly to i0
	// i1 acks readGate after receiving → backpressure

	inputToReadGate := make(chan int, 1)
	i1AckToReadGate := make(chan int, 1)
	inhibitRightAckToReadGate := make(chan int, 1)
	readGateToI0 := make(chan int, 1)
	input_node := INN.InputNode{Id: 0, Input: input, ToNext: inputToReadGate}

	// Prime acks so first input flows through
	i1AckToReadGate <- 1
	inhibitRightAckToReadGate <- 1

	readGate := RGN.ReadGateNode{Id: 0, FromValue: inputToReadGate, FromAcks: []<-chan int{i1AckToReadGate, inhibitRightAckToReadGate}, ToLatch: readGateToI0}

	i0ToI1 := make(chan int, 1)
	i0ToInhibitRight := make(chan int, 1)
	i0 := CI.NewChainInhibitorNode(0, readGateToI0, i0ToI1)
	i0.ToEdge = []chan<- int{i0ToInhibitRight}

	i1ToInhibitRight := make(chan int, 1)
	i1 := CI.NewChainInhibitorNode(1, i0ToI1, make(chan int, 3))
	i1.ToAck = i1AckToReadGate
	i1.ToEdge = []chan<- int{i1ToInhibitRight}

	inhibitRight := IRG.InhibitRightGateNode{Id: 0, FromLeft: i0ToInhibitRight, FromRight: i1ToInhibitRight, ToOut: make(chan int, 1), ToAck: inhibitRightAckToReadGate}

	l.Line = []S.Node{&input_node, &readGate, &i0, &i1, &inhibitRight}
}
