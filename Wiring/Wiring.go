package Wiring

import (
	EdN "github.com/dtauraso/congenial-octo-pancake/EdgeNode"
	IN "github.com/dtauraso/congenial-octo-pancake/InhibitorNode"
	PN "github.com/dtauraso/congenial-octo-pancake/PartitionNode"
)

func ConnectInhibitorPair(prev *IN.InhibitorNode, next *IN.InhibitorNode) {
	toNext := make(chan int, 1)
	prev.ToNextInhibitor = toNext
	next.FromPrevInhibitor = toNext
}

func ConnectInhibitorTransferChannels(prev *IN.InhibitorNode, next *IN.InhibitorNode) {
	endPartition := make(chan chan<- int, 1)
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
	endToPartition := make(chan int, 1)
	endFromPartition := make(chan int, 1)
	inhibitor.EndToPartition = endToPartition
	partition.EndFromInhibitor = endToPartition
	partition.EndToInhibitor = endFromPartition
	inhibitor.EndFromPartition = endFromPartition
}
