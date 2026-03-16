package Wiring

import (
	EdN "github.com/dtauraso/congenial-octo-pancake/go-project/EdgeNode"
	IN "github.com/dtauraso/congenial-octo-pancake/go-project/InhibitorNode"
	PN "github.com/dtauraso/congenial-octo-pancake/go-project/PartitionNode"
)

func ConnectInhibitorPair(prev *IN.InhibitorNode, next *IN.InhibitorNode) {
	toNext := make(chan int, 1)
	toPrev := make(chan int, 1)
	prev.ToNextInhibitor = toNext
	next.FromPrevInhibitor = toNext
	next.ToPrevInhibitor = toPrev
	prev.FromNextInhibitor = toPrev
}

func ConnectInhibitorTransferChannels(prev *IN.InhibitorNode, next *IN.InhibitorNode) {
	tracker := make(chan chan<- int, 1)
	endPartition := make(chan chan<- int, 1)
	prev.TransferTrackerChannelFromCurrentInhibitorToNextInhibitor = tracker
	next.TransferTrackerChannelFromPrevInhibitorToCurrentInhibitor = tracker
	prev.TransferEndPartitionChannelFromCurrentInhibitorToNextInhibitor = endPartition
	next.TransferEndPartitionChannelFromPrevInhibitorToCurrentInhibitor = endPartition
}

func ConnectEdgeBetweenInhibitors(current *IN.InhibitorNode, edge *EdN.EdgeNode, next *IN.InhibitorNode) {
	toEdge := make(chan int, 1)
	fromEdge := make(chan int, 1)
	nextToEdge := make(chan int, 1)
	current.ToEdgeNode = toEdge
	edge.FromCurrentInhibitor = toEdge
	edge.ToCurrentInhibitor = fromEdge
	current.FromEdgeNode = fromEdge
	next.ToEdgeNode = nextToEdge
	edge.FromNextInhibitor = nextToEdge
}

func ConnectInhibitorToPartition(inhibitor *IN.InhibitorNode, partition *PN.PartitionNode) {
	startToPartition := make(chan int, 1)
	startFromPartition := make(chan int, 1)
	trackerToPartition := make(chan int, 1)
	trackerFromPartition := make(chan int, 1)
	endToPartition := make(chan int, 1)
	endFromPartition := make(chan int, 1)
	inhibitor.StartToPartition = startToPartition
	partition.StartFromInhibitor = startToPartition
	partition.StartToInhibitor = startFromPartition
	inhibitor.StartFromPartition = startFromPartition
	inhibitor.TrackerToPartition = trackerToPartition
	partition.TrackerFromInhibitor = trackerToPartition
	partition.TrackerToInhibitor = trackerFromPartition
	inhibitor.TrackerFromPartition = trackerFromPartition
	inhibitor.EndToPartition = endToPartition
	partition.EndFromInhibitor = endToPartition
	partition.EndToInhibitor = endFromPartition
	inhibitor.EndFromPartition = endFromPartition
}
