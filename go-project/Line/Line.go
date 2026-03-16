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
	InputNode    *IN.InhibitorNode
	InputChannel chan<- int
}

func (l *Line) Setup() {
	i1 := IN.InhibitorNode{Id: 1}
	i2 := IN.InhibitorNode{Id: 2}
	i3 := IN.InhibitorNode{Id: 3}
	edn1 := EdN.EdgeNode{}
	edn2 := EdN.EdgeNode{}
	partition_node := PN.PartitionNode{Id: 0}

	fromInhibitor := make(chan int, 1)
	i1.FromInhibitor = fromInhibitor
	l.InputChannel = fromInhibitor

	W.ConnectInhibitorPair(&i1, &i2)
	W.ConnectInhibitorPair(&i2, &i3)
	W.ConnectInhibitorTransferChannels(&i1, &i2)
	W.ConnectEdgeBetweenInhibitors(&i1, &edn1, &i2)
	W.ConnectInhibitorToPartition(&i1, &partition_node)

	edn2.FromCurrentInhibitor = make(chan int, 1)
	edn2.ToCurrentInhibitor = make(chan int, 1)
	FromInhibitor3ToEdgeNode2 := make(chan int, 1)
	i3.ToEdgeNode = FromInhibitor3ToEdgeNode2
	edn2.FromNextInhibitor = FromInhibitor3ToEdgeNode2

	l.InputNode = &i1
	l.Line = []S.Node{&i1, &edn1, &i2, &edn2, &i3, &partition_node}
}

func (l *Line) Input() {
	l.TestInput = []int{1, 1}
}
