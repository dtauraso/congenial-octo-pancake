package Line

import (
	EdN "github.com/dtauraso/congenial-octo-pancake/go-project/EdgeNode"
	IN "github.com/dtauraso/congenial-octo-pancake/go-project/InhibitorNode"
	PN "github.com/dtauraso/congenial-octo-pancake/go-project/PartitionNode"
	S "github.com/dtauraso/congenial-octo-pancake/go-project/SafeWorker"
	W "github.com/dtauraso/congenial-octo-pancake/go-project/Wiring"
)

type Line struct {
	Line         []S.Node
	TestInput    []int
	InputChannel chan<- int
}

func (l *Line) Setup() {
	i0 := IN.InhibitorNode{Id: 0}
	i1 := IN.InhibitorNode{Id: 1}
	i2 := IN.InhibitorNode{Id: 2}
	i3 := IN.InhibitorNode{Id: 3}
	edn0 := EdN.EdgeNode{Id: 0}
	edn1 := EdN.EdgeNode{Id: 1}
	edn2 := EdN.EdgeNode{Id: 2}
	partition_node := PN.PartitionNode{Id: 0}

	fromInhibitor := make(chan int, 1)
	i0.FromInhibitor = fromInhibitor
	l.InputChannel = fromInhibitor

	W.ConnectInhibitorPair(&i0, &i1)
	W.ConnectInhibitorPair(&i1, &i2)
	W.ConnectInhibitorPair(&i2, &i3)
	W.ConnectInhibitorTransferChannels(&i1, &i2)
	W.ConnectEdgeBetweenInhibitors(&i0, &edn0, &i1)
	W.ConnectEdgeBetweenInhibitors(&i1, &edn1, &i2)
	W.ConnectInhibitorToPartition(&i1, &partition_node)

	edn2.FromCurrentInhibitor = make(chan int, 1)
	edn2.ToCurrentInhibitor = make(chan int, 1)
	FromInhibitor3ToEdgeNode2 := make(chan int, 1)
	i3.ToEdgeNode = FromInhibitor3ToEdgeNode2
	edn2.FromNextInhibitor = FromInhibitor3ToEdgeNode2

	l.Line = []S.Node{&i0, &edn0, &i1, &edn1, &i2, &edn2, &i3, &partition_node}
}

func (l *Line) Input() {
	l.TestInput = []int{1, 1}
}
