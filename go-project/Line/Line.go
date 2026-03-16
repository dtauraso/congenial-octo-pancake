package Line

import (
	EdN "github.com/dtauraso/congenial-octo-pancake/go-project/EdgeNode"

	IN "github.com/dtauraso/congenial-octo-pancake/go-project/InhibitorNode"
	PN "github.com/dtauraso/congenial-octo-pancake/go-project/PartitionNode"
	S "github.com/dtauraso/congenial-octo-pancake/go-project/SafeWorker"
)

type Line struct {
	Line       []S.Node
	TestInput  []int
	InputNode  *IN.InhibitorNode
}

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

func (l *Line) Setup() {
	i1 := IN.InhibitorNode{Id: 1}
	i2 := IN.InhibitorNode{Id: 2}
	i3 := IN.InhibitorNode{Id: 3}
	edn1 := EdN.EdgeNode{}
	edn2 := EdN.EdgeNode{}
	partition_node := PN.PartitionNode{Id: 0}

	ConnectInhibitorPair(&i1, &i2)
	ConnectInhibitorPair(&i2, &i3)
	ConnectInhibitorTransferChannels(&i1, &i2)
	ConnectEdgeBetweenInhibitors(&i1, &edn1, &i2)
	ConnectInhibitorToPartition(&i1, &partition_node)

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
