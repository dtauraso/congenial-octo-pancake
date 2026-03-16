package Line

import (
	EdN "github.com/dtauraso/congenial-octo-pancake/go-project/EdgeNode"
	IN "github.com/dtauraso/congenial-octo-pancake/go-project/InhibitorNode"
	PN "github.com/dtauraso/congenial-octo-pancake/go-project/PartitionNode"
)

type Line struct {
	Line      []any
	TestInput []int
}

func (l *Line) Setup() {
	ToInhibitor1FromInhibitor2 := make(chan int, 1)
	ToInhibitor2FromInhibitor1 := make(chan int, 1)
	ToEdgeNode1FromInhibitor1 := make(chan int, 1)
	FromEdgeNode1ToInhibitor1 := make(chan int, 1)
	ToEdgeNode2ToInhibitor1 := make(chan int, 1)
	FromEdgeNode2ToInhibitor1 := make(chan int, 1)
	FromInhibitor2ToEdgeNode1 := make(chan int, 1)
	TransferTrackerChannelFromInhibitor1ToInhibitor2 := make(chan chan<- int, 1)
	TransferEndPartitionChannelFromInhibitor1ToInhibitor2 := make(chan chan<- int, 1)

	EndToInhibitorEndFromPartition := make(chan int, 1)
	EndToInhibitorEndToPartition := make(chan int, 1)

	i1 := IN.InhibitorNode{
		Id:                1,
		FromNextInhibitor: ToInhibitor1FromInhibitor2,
		ToNextInhibitor:   ToInhibitor2FromInhibitor1,
		ToEdgeNode:        ToEdgeNode1FromInhibitor1,
		FromEdgeNode:      FromEdgeNode1ToInhibitor1,
		EndFromPartition:  EndToInhibitorEndFromPartition,
		EndToPartition:    EndToInhibitorEndToPartition,
		TransferTrackerChannelFromCurrentInhibitorToNextInhibitor:      TransferTrackerChannelFromInhibitor1ToInhibitor2,
		TransferEndPartitionChannelFromCurrentInhibitorToNextInhibitor: TransferEndPartitionChannelFromInhibitor1ToInhibitor2,
	}
	edn1 := EdN.EdgeNode{
		FromCurrentInhibitor: ToEdgeNode1FromInhibitor1,
		ToCurrentInhibitor:   FromEdgeNode1ToInhibitor1,
		FromNextInhibitor:    FromInhibitor2ToEdgeNode1,
	}
	ToInhibitor2FromInhibitor3 := make(chan int, 1)
	ToInhibitor3FromInhibitor2 := make(chan int, 1)
	FromInhibitor3ToEdgeNode2 := make(chan int, 1)

	i2 := IN.InhibitorNode{
		Id:                2,
		FromPrevInhibitor: ToInhibitor2FromInhibitor1,
		ToPrevInhibitor:   ToInhibitor1FromInhibitor2,
		FromNextInhibitor: ToInhibitor2FromInhibitor3,
		ToNextInhibitor:   ToInhibitor3FromInhibitor2,
		ToEdgeNode:        FromInhibitor2ToEdgeNode1,
		TransferTrackerChannelFromPrevInhibitorToCurrentInhibitor:      TransferTrackerChannelFromInhibitor1ToInhibitor2,
		TransferEndPartitionChannelFromPrevInhibitorToCurrentInhibitor: TransferEndPartitionChannelFromInhibitor1ToInhibitor2,
	}
	edn2 := EdN.EdgeNode{
		FromCurrentInhibitor: ToEdgeNode2ToInhibitor1,
		ToCurrentInhibitor:   FromEdgeNode2ToInhibitor1,
		FromNextInhibitor:    FromInhibitor3ToEdgeNode2,
	}

	i3 := IN.InhibitorNode{
		Id:                3,
		FromPrevInhibitor: ToInhibitor2FromInhibitor3,
		ToPrevInhibitor:   ToInhibitor3FromInhibitor2,
		ToEdgeNode:        FromInhibitor3ToEdgeNode2,
	}
	StartFromInhibitorStartFromPartition := make(chan int, 1)
	StartToInhibitorStartToPartition := make(chan int, 1)
	TrackerFromInhibitorTrackerFromPartition := make(chan int, 1)
	TrackerToInhibitorTrackerToPartition := make(chan int, 1)
	partition_node := PN.PartitionNode{Id: 0,
		StartFromInhibitor:   StartFromInhibitorStartFromPartition,
		StartToInhibitor:     StartToInhibitorStartToPartition,
		TrackerFromInhibitor: TrackerFromInhibitorTrackerFromPartition,
		TrackerToInhibitor:   TrackerToInhibitorTrackerToPartition,
		EndToInhibitor:       EndToInhibitorEndFromPartition,
	}
	l.Line = []any{&i1, &edn1, &i2, &edn2, &i3, &partition_node}

}

func (l *Line) Input() {
	l.TestInput = []int{1, 1}
}
