package Line

import (
	CI "github.com/dtauraso/congenial-octo-pancake/ChainInhibitorNode"
	INN "github.com/dtauraso/congenial-octo-pancake/InputNode"
	RGN "github.com/dtauraso/congenial-octo-pancake/ReadGateNode"
	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
)

type Line struct {
	Line []S.Node
}

func (l *Line) Setup() {
	input := make(chan int, 4)
	input <- 0
	input <- 1
	input <- 1
	input <- 0

	// Cascade-copy chain: in0 -> readGate -> i0 -> i1
	// readGate: AND(in0 ready, i1 ack) → forwards value directly to i0
	// i1 acks readGate after receiving → backpressure

	inputToReadGate := make(chan int, 1)
	i1AckToReadGate := make(chan int, 1)
	readGateToI0 := make(chan int, 1)
	input_node := INN.InputNode{Id: 0, Input: input, ToNext: inputToReadGate}

	// Prime ack so first input flows through
	i1AckToReadGate <- 1

	readGate := RGN.ReadGateNode{Id: 0, FromValue: inputToReadGate, FromAck: i1AckToReadGate, ToLatch: readGateToI0}

	i0ToI1 := make(chan int, 1)
	i0 := CI.NewChainInhibitorNode(0, readGateToI0, i0ToI1)

	i1 := CI.NewChainInhibitorNode(1, i0ToI1, make(chan int, 3))
	i1.ToAck = i1AckToReadGate

	l.Line = []S.Node{&input_node, &readGate, &i0, &i1}
}
