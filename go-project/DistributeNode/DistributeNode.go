package DistributeNode

import (
	"fmt"
	EdN "github.com/dtauraso/congenial-octo-pancake/go-project/EdgeNode"
	IN "github.com/dtauraso/congenial-octo-pancake/go-project/InhibitorNode"
	PN "github.com/dtauraso/congenial-octo-pancake/go-project/PartitionNode"
	S "github.com/dtauraso/congenial-octo-pancake/go-project/SafeWorker"
	W "github.com/dtauraso/congenial-octo-pancake/go-project/Wiring"
)

type DistributeNode struct {
	Id    int
	Input <-chan int
}

func (d *DistributeNode) MakeNewTimelineAndPartition(line *[]S.Node, s *S.SafeWorker) {
	i1 := IN.InhibitorNode{Id: 1}
	i2 := IN.InhibitorNode{Id: 3}
	i3 := IN.InhibitorNode{Id: 3}
	edn1 := EdN.EdgeNode{}
	edn2 := EdN.EdgeNode{}
	partition_node := PN.PartitionNode{Id: 0}

	W.ConnectInhibitorPair(&i1, &i2)
	W.ConnectInhibitorPair(&i2, &i3)
	W.ConnectEdgeBetweenInhibitors(&i1, &edn1, &i2)
	W.ConnectInhibitorToPartition(&i1, &partition_node)

	edn2.FromCurrentInhibitor = make(chan int, 1)
	edn2.ToCurrentInhibitor = make(chan int, 1)
	FromInhibitor3ToEdgeNode2 := make(chan int, 1)
	i3.ToEdgeNode = FromInhibitor3ToEdgeNode2
	edn2.FromNextInhibitor = FromInhibitor3ToEdgeNode2

	s.Wg.Add(6)
	*line = append(*line, S.Node(&i1), S.Node(&edn1), S.Node(&i2), S.Node(&edn2), S.Node(&i3), S.Node(&partition_node))
}

func (d *DistributeNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		fmt.Printf("%dI1 is being run\n", d.Id)
		select {
		case <-s.Ctx.Done():
			return
		default:
		}
	}
}
