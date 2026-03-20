package Line

import (
	AN "github.com/dtauraso/congenial-octo-pancake/AndGateNode"
	CI "github.com/dtauraso/congenial-octo-pancake/ChainInhibitorNode"
	EN "github.com/dtauraso/congenial-octo-pancake/EdgeNode"
	INN "github.com/dtauraso/congenial-octo-pancake/InputNode"
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

	inputToChain := make(chan int, 1)
	input_node := INN.InputNode{Id: 0, Input: input, ToNext: inputToChain}

	// Chain: in0 -> i0 -> i1
	i0ToI1 := make(chan int, 1)
	i0 := CI.ChainInhibitorNode{Id: 0, FromPrev: inputToChain, ToNext: i0ToI1}
	i1 := CI.ChainInhibitorNode{Id: 1, FromPrev: i0ToI1, ToNext: make(chan int, 3)}

	// xor0: between i0 and i1
	i0ToXor0 := make(chan int, 1)
	i1ToXor0 := make(chan int, 1)
	xor0ToI0 := make(chan int, 1)
	xor0ToPartition := make(chan int, 3)
	xor0ToXor1 := make(chan int, 1)
	xor0 := EN.EdgeNode{Id: 0, FromCurrentInhibitor: i0ToXor0, ToCurrentInhibitor: xor0ToI0, FromNextInhibitor: i1ToXor0, ToPartition: xor0ToPartition, ToNextEdge: xor0ToXor1}

	// xor1: both sides connected to i1, receives from xor0
	i1ToXor1Left := make(chan int, 1)
	i1ToXor1Right := make(chan int, 1)
	xor1ToI1 := make(chan int, 1)
	xor1ToPartition := make(chan int, 3)
	xor1 := EN.EdgeNode{Id: 1, FromCurrentInhibitor: i1ToXor1Left, ToCurrentInhibitor: xor1ToI1, FromNextInhibitor: i1ToXor1Right, ToPartition: xor1ToPartition, FromPrevEdge: xor0ToXor1}

	// Wire edge channels to inhibitors
	i0.ToEdge = []chan<- int{i0ToXor0}
	i1.ToEdge = []chan<- int{i1ToXor0, i1ToXor1Left, i1ToXor1Right}

	// a0: AND gate fed by xor0 and xor1
	andOut := make(chan int, 3)
	a0 := AN.AndGateNode{Id: 0, FromLeft: xor0ToPartition, FromRight: xor1ToPartition, ToNext: andOut}

	l.Line = []S.Node{&input_node, &i0, &i1, &xor0, &xor1, &a0}
}
