package Line

import (
	AN "github.com/dtauraso/congenial-octo-pancake/AndGateNode"
	CAN "github.com/dtauraso/congenial-octo-pancake/CascadeAndGateNode"
	CI "github.com/dtauraso/congenial-octo-pancake/ChainInhibitorNode"
	INN "github.com/dtauraso/congenial-octo-pancake/InputNode"
	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
)

type Line struct {
	Line []S.Node
}

func (l *Line) Setup() {
	input := make(chan int, 3)
	input <- 1
	input <- 1
	input <- 0

	inputToChain := make(chan int, 1)
	input_node := INN.InputNode{Id: 0, Input: input, ToNext: inputToChain}

	// Chain inhibitor nodes
	i0 := CI.ChainInhibitorNode{Id: 0, FromPrev: inputToChain}
	i1 := CI.ChainInhibitorNode{Id: 1}
	i2 := CI.ChainInhibitorNode{Id: 2}

	// Cascade AND gate 0: between i0 and i1
	cascadeValue0 := make(chan int, 1)
	cascadeSignal0 := make(chan int, 1)
	cascadeOut0 := make(chan int, 1)
	i0.ToCascadeAndGateValue = cascadeValue0
	i0.ToCascadeAndGateSignal = cascadeSignal0
	cg0 := CAN.CascadeAndGateNode{Id: 0, FromValue: cascadeValue0, FromLeft: cascadeSignal0, RightSignal: 1, HasRight: true, ToNext: cascadeOut0}
	i1.FromPrev = cascadeOut0

	// Cascade AND gate 1: between i1 and i2
	cascadeValue1 := make(chan int, 1)
	cascadeSignal1 := make(chan int, 1)
	cascadeOut1 := make(chan int, 1)
	i1.ToCascadeAndGateValue = cascadeValue1
	i1.ToCascadeAndGateSignal = cascadeSignal1
	cg1 := CAN.CascadeAndGateNode{Id: 1, FromValue: cascadeValue1, FromLeft: cascadeSignal1, RightSignal: 1, HasRight: true, ToNext: cascadeOut1}
	i2.FromPrev = cascadeOut1

	// i2 cascade output (terminal)
	i2.ToCascadeAndGateValue = make(chan int, 3)
	i2.ToCascadeAndGateSignal = make(chan int, 3)

	// Recognition AND gate: compares i1 and i2
	recLeft := make(chan int, 1)
	recRight := make(chan int, 1)
	recOut := make(chan int, 1)
	i1.ToRecognitionAndGate = recLeft
	i2.ToRecognitionAndGate = recRight
	a0 := AN.AndGateNode{Id: 0, FromLeft: recLeft, FromRight: recRight, ToNext: recOut}

	l.Line = []S.Node{&input_node, &i0, &cg0, &i1, &cg1, &i2, &a0}
}
