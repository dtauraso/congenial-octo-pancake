package Line

import (
	AN "github.com/dtauraso/congenial-octo-pancake/AndGateNode"
	CI "github.com/dtauraso/congenial-octo-pancake/ChainInhibitorNode"
	INN "github.com/dtauraso/congenial-octo-pancake/InputNode"
	RGN "github.com/dtauraso/congenial-octo-pancake/ReadGateNode"
	RLN "github.com/dtauraso/congenial-octo-pancake/ReadLatchNode"
	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
	SBD "github.com/dtauraso/congenial-octo-pancake/StreakBreakDetector"
	SD "github.com/dtauraso/congenial-octo-pancake/StreakDetector"
	SGN "github.com/dtauraso/congenial-octo-pancake/SyncGateNode"
	SLN "github.com/dtauraso/congenial-octo-pancake/SyncLatchNode"
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

	// Chain: in0 -> readLatch --(readGate release)--> i0 -> detectorLatch --(syncGate release)--> i1
	// readGate: AND(in0 ready, detectorLatch ack) → releases readLatch
	// syncGate: AND(sbd0 done, sd0 done) → releases detectorLatch
	// detectorLatch acks readGate after releasing → backpressure

	inputToReadLatch := make(chan int, 1)
	in0ReadyToReadGate := make(chan int, 1)
	detectorLatchAckToReadGate := make(chan int, 1)
	readGateToReadLatch := make(chan int, 1)
	readLatchToI0 := make(chan int, 1)
	input_node := INN.InputNode{Id: 0, Input: input, ToNext: inputToReadLatch, ToReady: in0ReadyToReadGate}

	// Prime ack so first input flows through
	detectorLatchAckToReadGate <- 1

	readLatch := RLN.ReadLatchNode{Id: 0, FromInput: inputToReadLatch, ToChain: readLatchToI0, Release: readGateToReadLatch}
	readGate := RGN.ReadGateNode{Id: 0, FromReady: in0ReadyToReadGate, FromAck: detectorLatchAckToReadGate, ToRelease: readGateToReadLatch}

	i0ToDetectorLatch := make(chan int, 1)
	sbd0DoneToSyncGate := make(chan int, 1)
	sd0DoneToSyncGate := make(chan int, 1)
	syncGateToDetectorLatch := make(chan int, 1)
	detectorLatchToI1 := make(chan int, 1)
	i0 := CI.NewChainInhibitorNode(0, readLatchToI0, i0ToDetectorLatch)

	detectorLatch := SLN.SyncLatchNode{Id: 0, FromChain: i0ToDetectorLatch, ToChain: detectorLatchToI1, Release: syncGateToDetectorLatch, ToAck: detectorLatchAckToReadGate}
	syncGate := SGN.SyncGateNode{Id: 0, FromSbdDone: sbd0DoneToSyncGate, FromSdDone: sd0DoneToSyncGate, ToRelease: syncGateToDetectorLatch}
	i1 := CI.NewChainInhibitorNode(1, detectorLatchToI1, make(chan int, 3))

	// sbd0: streak break detector on i0 (old+new from i0)
	i0OldToSbd0 := make(chan int, 1)
	i0NewToSbd0 := make(chan int, 1)
	sbd0ToPartition := make(chan int, 3)
	sbd0 := SBD.StreakBreakDetector{Id: 0, FromCurrentInhibitor: i0OldToSbd0, FromNextInhibitor: i0NewToSbd0, ToPartition: sbd0ToPartition, ToSync: sbd0DoneToSyncGate}

	// sbd1: streak break detector on i1 (old+new from i1)
	i1OldToSbd1 := make(chan int, 1)
	i1NewToSbd1 := make(chan int, 1)
	sbd1ToPartition := make(chan int, 3)
	sbd1 := SBD.StreakBreakDetector{Id: 1, FromCurrentInhibitor: i1OldToSbd1, FromNextInhibitor: i1NewToSbd1, ToPartition: sbd1ToPartition}

	// sd0: streak detector on i0 (old+new from i0)
	i0OldToSd0 := make(chan int, 1)
	i0NewToSd0 := make(chan int, 1)
	sd0ToSd1 := make(chan int, 1)
	sd0 := SD.StreakDetector{Id: 0, FromCurrentInhibitor: i0OldToSd0, FromNextInhibitor: i0NewToSd0, ToNextDetector: sd0ToSd1, ToSync: sd0DoneToSyncGate}

	// sd1: streak detector on i1 (old+new from i1)
	i1OldToSd1 := make(chan int, 1)
	i1NewToSd1 := make(chan int, 1)
	sd1 := SD.StreakDetector{Id: 1, CurrentInhibitor: &i1, StreakBreakDetector: &sbd1, SbdNextChan: i1NewToSbd1, SdNextChan: i1NewToSd1, FromCurrentInhibitor: i1OldToSd1, FromNextInhibitor: i1NewToSd1, FromPrevDetector: sd0ToSd1}

	// Wire edge channels to inhibitors (old + new)
	i0.ToEdge = []chan<- int{i0OldToSbd0, i0OldToSd0}
	i0.ToEdgeNew = []chan<- int{i0NewToSbd0, i0NewToSd0}
	i1.ToEdge = []chan<- int{i1OldToSbd1, i1OldToSd1}
	i1.ToEdgeNew = []chan<- int{i1NewToSbd1, i1NewToSd1}

	// a0: AND gate fed by sbd0 and sbd1
	andOut := make(chan int, 3)
	a0 := AN.AndGateNode{Id: 0, FromLeft: sbd0ToPartition, FromRight: sbd1ToPartition, ToNext: andOut}

	l.Line = []S.Node{&input_node, &readLatch, &readGate, &i0, &detectorLatch, &syncGate, &i1, &sbd0, &sbd1, &sd0, &sd1, &a0}
}
