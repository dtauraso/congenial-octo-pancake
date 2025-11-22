package DistributeNode

import (
	"context"
	"fmt"
	EdN "github.com/dtauraso/congenial-octo-pancake/go-project/EdgeNode"
	ExN "github.com/dtauraso/congenial-octo-pancake/go-project/ExcitatoryNode"
	IN "github.com/dtauraso/congenial-octo-pancake/go-project/InhibitorNode"
	PN "github.com/dtauraso/congenial-octo-pancake/go-project/PartitionNode"
	"sync"
)

type DistributeNode struct {
	Id                                int
	Input                             <-chan int
	CanAddTimeline                    bool
	PartitionIsMadeFromInhibitor      <-chan bool
	FromFirstNextInhibitor            <-chan int
	ToFirstNextInhibitor              chan<- int
	FromSecondNextInhibitor           <-chan int
	ToSecondNextInhibitor             chan<- int
	SelfReferenceToFirstNextInhibitor chan<- *DistributeNode
}

func (d *DistributeNode) MakeNewTimelineAndPartition(line *[]any, ctx context.Context, wg *sync.WaitGroup) {

	ToInhibitor1FromExcitatory1 := make(chan int, 1)
	FromInhibitor1ToExcitatory1 := make(chan int, 1)

	exn1 := ExN.ExcitatoryNode{
		Id:            0,
		Count:         0,
		ToInhibitor:   ToInhibitor1FromExcitatory1,
		FromInhibitor: FromInhibitor1ToExcitatory1,
	}
	ToInhibitor2FromExcitatory2 := make(chan int, 1)
	FromInhibitor2ToExcitatory2 := make(chan int, 1)
	ToInhibitor1FromInhibitor2 := make(chan int, 1)
	ToInhibitor2FromInhibitor1 := make(chan int, 1)
	ToEdgeNode1FromInhibitor1 := make(chan int, 1)
	FromEdgeNode1ToInhibitor1 := make(chan int, 1)
	ToEdgeNode2ToInhibitor1 := make(chan int, 1)
	FromEdgeNode2ToInhibitor1 := make(chan int, 1)
	FromInhibitor2ToEdgeNode1 := make(chan int, 1)

	// First inhibitor (no previous inhibitor)
	i1 := IN.InhibitorNode{
		Id:                1,
		FromExcitatory:    ToInhibitor1FromExcitatory1,
		ToExcitatory:      FromInhibitor1ToExcitatory1,
		FromNextInhibitor: ToInhibitor1FromInhibitor2,
		ToNextInhibitor:   ToInhibitor2FromInhibitor1,
		ToEdgeNode:        ToEdgeNode1FromInhibitor1,
		FromEdgeNode:      FromEdgeNode1ToInhibitor1,
	}
	edn1 := EdN.EdgeNode{
		FromCurrentInhibitor: ToEdgeNode1FromInhibitor1,
		ToCurrentInhibitor:   FromEdgeNode1ToInhibitor1,
		FromNextInhibitor:    FromInhibitor2ToEdgeNode1,
	}
	exn2 := ExN.ExcitatoryNode{
		Id:            2,
		Count:         0,
		ToInhibitor:   ToInhibitor2FromExcitatory2,
		FromInhibitor: FromInhibitor2ToExcitatory2,
	}
	ToInhibitor3ToExcitatory3 := make(chan int, 1)
	FromInhibitor3ToExcitatory3 := make(chan int, 1)
	ToInhibitor2FromInhibitor3 := make(chan int, 1)
	ToInhibitor3FromInhibitor2 := make(chan int, 1)
	FromInhibitor3ToEdgeNode2 := make(chan int, 1)

	// Second inhibitor (has previous inhibitor)
	i2 := IN.InhibitorNode{
		Id:                3,
		FromExcitatory:    ToInhibitor2FromExcitatory2,
		ToExcitatory:      FromInhibitor2ToExcitatory2,
		FromPrevInhibitor: ToInhibitor2FromInhibitor1,
		ToPrevInhibitor:   ToInhibitor1FromInhibitor2,
		FromNextInhibitor: ToInhibitor2FromInhibitor3,
		ToNextInhibitor:   ToInhibitor3FromInhibitor2,
		ToEdgeNode:        FromInhibitor2ToEdgeNode1,
	}
	edn2 := EdN.EdgeNode{
		FromCurrentInhibitor: ToEdgeNode2ToInhibitor1,
		ToCurrentInhibitor:   FromEdgeNode2ToInhibitor1,
		FromNextInhibitor:    FromInhibitor3ToEdgeNode2,
	}
	exn3 := ExN.ExcitatoryNode{
		Id:            2,
		Count:         0,
		ToInhibitor:   ToInhibitor3ToExcitatory3,
		FromInhibitor: FromInhibitor3ToExcitatory3,
	}
	// Second inhibitor (has previous inhibitor)
	i3 := IN.InhibitorNode{
		Id:                3,
		FromExcitatory:    ToInhibitor3ToExcitatory3,
		ToExcitatory:      FromInhibitor3ToExcitatory3,
		FromPrevInhibitor: ToInhibitor2FromInhibitor3,
		ToPrevInhibitor:   ToInhibitor3FromInhibitor2,
		ToEdgeNode:        FromInhibitor3ToEdgeNode2,
	}
	StartFromInhibitorStartFromPartition := make(chan int, 1)
	StartToInhibitorStartToPartition := make(chan int, 1)
	TrackerFromInhibitorTrackerFromPartition := make(chan int, 1)
	TrackerToInhibitorTrackerToPartition := make(chan int, 1)
	EndFromInhibitorEndFromPartition := make(chan int, 1)
	EndToInhibitorEndToPartition := make(chan int, 1)
	partition_node := PN.PartitionNode{Id: 0,
		StartFromInhibitor:   StartFromInhibitorStartFromPartition,
		StartToInhibitor:     StartToInhibitorStartToPartition,
		TrackerFromInhibitor: TrackerFromInhibitorTrackerFromPartition,
		TrackerToInhibitor:   TrackerToInhibitorTrackerToPartition,
		EndFromInhibitor:     EndFromInhibitorEndFromPartition,
		EndToInhibitor:       EndToInhibitorEndToPartition,
	}
	wg.Add(9)
	*line = append(*line, &exn1, &i1, &edn1, &exn2, &i2, &edn2, &exn3, &i3, &partition_node)

}

func (d *DistributeNode) Update(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()
	for {
		fmt.Printf("%dI1 is being run\n", d.Id)
		select {
		case number := <-d.Input:
			d.ToFirstNextInhibitor <- number

			if d.ToSecondNextInhibitor == nil {
				if d.CanAddTimeline {
				}
			} else {
				d.ToSecondNextInhibitor <- number
			}
		case CanAddTimeline := <-d.PartitionIsMadeFromInhibitor:
			d.CanAddTimeline = CanAddTimeline
		}
	}
}
