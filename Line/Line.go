package Line

import (
	AN "github.com/dtauraso/congenial-octo-pancake/AndGateNode"
	CAN "github.com/dtauraso/congenial-octo-pancake/CascadeAndGateNode"
	CI "github.com/dtauraso/congenial-octo-pancake/ChainInhibitorNode"
	INN "github.com/dtauraso/congenial-octo-pancake/InputNode"
	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
	SBD "github.com/dtauraso/congenial-octo-pancake/StreakBreakDetector"
	SD "github.com/dtauraso/congenial-octo-pancake/StreakDetector"
)

type Line struct {
	Line []S.Node
}

func (l *Line) Setup() {
	input := make(chan int, 4)
	input <- -1
	input <- 1
	input <- 1
	input <- -1

	inputToChain := make(chan int, 1)
	input_node := INN.InputNode{Id: 0, Input: input, ToNext: inputToChain}

	// Chain: in0 -> i0 -> sync0 -> i1
	i0ToSync0 := make(chan int, 1)
	sync0ToI1 := make(chan int, 1)
	sbd0DoneToSync0 := make(chan int, 1)
	sd0DoneToSync0 := make(chan int, 1)
	i0 := CI.NewChainInhibitorNode(0, inputToChain, i0ToSync0)
	sync0 := CAN.CascadeAndGateNode{Id: 0, FromValue: i0ToSync0, FromLeft: sbd0DoneToSync0, FromRight: sd0DoneToSync0, ToNext: sync0ToI1}
	i1 := CI.NewChainInhibitorNode(1, sync0ToI1, make(chan int, 3))

	// sbd0: streak break detector between i0 and i1
	i0ToSbd0 := make(chan int, 1)
	i1ToSbd0 := make(chan int, 1)
	sbd0ToI0 := make(chan int, 1)
	sbd0ToPartition := make(chan int, 3)
	sbd0 := SBD.StreakBreakDetector{Id: 0, FromCurrentInhibitor: i0ToSbd0, ToCurrentInhibitor: sbd0ToI0, FromNextInhibitor: i1ToSbd0, ToPartition: sbd0ToPartition, ToSync: sbd0DoneToSync0}

	// sbd1: streak break detector on i1
	i1ToSbd1Left := make(chan int, 1)
	i1ToSbd1Right := make(chan int, 1)
	sbd1ToI1 := make(chan int, 1)
	sbd1ToPartition := make(chan int, 3)
	sbd1 := SBD.StreakBreakDetector{Id: 1, FromCurrentInhibitor: i1ToSbd1Left, ToCurrentInhibitor: sbd1ToI1, FromNextInhibitor: i1ToSbd1Right, ToPartition: sbd1ToPartition}

	// sd0: streak detector between i0 and i1
	i0ToSd0 := make(chan int, 1)
	i1ToSd0 := make(chan int, 1)
	sd0ToSd1 := make(chan int, 1)
	sd0 := SD.StreakDetector{Id: 0, FromCurrentInhibitor: i0ToSd0, FromNextInhibitor: i1ToSd0, ToNextDetector: sd0ToSd1, ToSync: sd0DoneToSync0}

	// sd1: streak detector on i1
	i1ToSd1Left := make(chan int, 1)
	i1ToSd1Right := make(chan int, 1)
	sd1 := SD.StreakDetector{Id: 1, CurrentInhibitor: &i1, StreakBreakDetector: &sbd1, SbdNextChan: i1ToSbd1Right, SdNextChan: i1ToSd1Right, FromCurrentInhibitor: i1ToSd1Left, FromNextInhibitor: i1ToSd1Right, FromPrevDetector: sd0ToSd1}

	// Wire edge channels to inhibitors
	i0.ToEdge = []chan<- int{i0ToSbd0, i0ToSd0}
	i1.ToEdge = []chan<- int{i1ToSbd0, i1ToSbd1Left, i1ToSbd1Right, i1ToSd0, i1ToSd1Left, i1ToSd1Right}

	// a0: AND gate fed by sbd0 and sbd1
	andOut := make(chan int, 3)
	a0 := AN.AndGateNode{Id: 0, FromLeft: sbd0ToPartition, FromRight: sbd1ToPartition, ToNext: andOut}

	l.Line = []S.Node{&input_node, &i0, &sync0, &i1, &sbd0, &sbd1, &sd0, &sd1, &a0}
}
