package Line

import (
	EdN "github.com/dtauraso/congenial-octo-pancake/EdgeNode"
	IN "github.com/dtauraso/congenial-octo-pancake/InhibitorNode"
	INN "github.com/dtauraso/congenial-octo-pancake/InputNode"
	PN "github.com/dtauraso/congenial-octo-pancake/PartitionNode"
	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
	W "github.com/dtauraso/congenial-octo-pancake/Wiring"
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

	i0 := IN.InhibitorNode{Id: 0, FromPrevInhibitor: inputToChain}
	i1 := IN.InhibitorNode{Id: 1}
	i2 := IN.InhibitorNode{Id: 2}
	edn0 := EdN.EdgeNode{Id: 0}
	edn1 := EdN.EdgeNode{Id: 1}
	partition_node := PN.PartitionNode{Id: 0}

	W.ConnectInhibitorPair(&i0, &i1)
	W.ConnectInhibitorPair(&i1, &i2)
	W.ConnectInhibitorTransferChannels(&i1, &i2)
	edgeToPartition := make(chan int, 1)
	edn0.ToPartition = edgeToPartition
	partition_node.FromEdge = edgeToPartition

	W.ConnectEdgeBetweenInhibitors(&i0, &edn0, &i1)
	W.ConnectEdgeBetweenInhibitors(&i1, &edn1, &i2)
	W.ConnectInhibitorToPartition(&i1, &partition_node)

	i2.ToNextInhibitor = make(chan int, 3)

	l.Line = []S.Node{&input_node, &i0, &edn0, &i1, &edn1, &i2, &partition_node}
}
