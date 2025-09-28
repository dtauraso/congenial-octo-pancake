package Line

import (
	EdN "github.com/dtauraso/congenial-octo-pancake/go-project/EdgeNode"
	ExN "github.com/dtauraso/congenial-octo-pancake/go-project/ExcitatoryNode"
	IN "github.com/dtauraso/congenial-octo-pancake/go-project/InhibitorNode"
)

type Line struct {
	Line      []any
	TestInput []int
}

func (l *Line) Setup() {

	ToInhibitorFromExcitatory := make(chan int, 1)
	FromInhibitorToExcitatory := make(chan int, 1)
	ToInhibitorFromExcitatory2 := make(chan int, 1)
	FromInhibitorToExcitatory2 := make(chan int, 1)
	FromNextInhibitorToPrevInhibitor := make(chan int, 1)
	ToNextInhibitorFromPrevInhibitor := make(chan int, 1)
	ToEdgeNodeFromFirstInhibitor := make(chan int, 1)
	FromEdgeNodeToFirstInhibitor := make(chan int, 1)
	FromSecondInhibitorToEdgeNode := make(chan int, 1)
	// Transfer payload (spawn + tracker channel) between inhibitors
	TransferSpawnedPartition := make(chan IN.SpawnTransfer, 1)
	// Channel-of-channel transfer between inhibitors
	MoveChannelFromFirstToSecond := make(chan chan<- int, 1)

	exn1 := ExN.ExcitatoryNode{
		Id:            0,
		Count:         0,
		ToInhibitor:   ToInhibitorFromExcitatory,
		FromInhibitor: FromInhibitorToExcitatory,
	}
	// First inhibitor (no previous inhibitor)
	i1 := IN.InhibitorNode{
		Id:                      1,
		FromExcitatory:          ToInhibitorFromExcitatory,
		ToExcitatory:            FromInhibitorToExcitatory,
		FromNextInhibitor:       FromNextInhibitorToPrevInhibitor,
		ToNextInhibitor:         ToNextInhibitorFromPrevInhibitor,
		ToEdgeNode:              ToEdgeNodeFromFirstInhibitor,
		FromEdgeNode:            FromEdgeNodeToFirstInhibitor,
		MoveToNextInhibitor:     MoveChannelFromFirstToSecond,
		TransferToNextInhibitor: TransferSpawnedPartition,
	}
	edn1 := EdN.EdgeNode{
		FromFirstInhibitor:  ToEdgeNodeFromFirstInhibitor,
		ToFirstInhibitor:    FromEdgeNodeToFirstInhibitor,
		FromSecondInhibitor: FromSecondInhibitorToEdgeNode,
	}
	exn2 := ExN.ExcitatoryNode{
		Id:            2,
		Count:         0,
		ToInhibitor:   ToInhibitorFromExcitatory2,
		FromInhibitor: FromInhibitorToExcitatory2,
	}
	// Second inhibitor (has previous inhibitor)
	i2 := IN.InhibitorNode{
		Id:                        3,
		FromExcitatory:            ToInhibitorFromExcitatory2,
		ToExcitatory:              FromInhibitorToExcitatory2,
		FromPrevInhibitor:         ToNextInhibitorFromPrevInhibitor,
		ToPrevInhibitor:           FromNextInhibitorToPrevInhibitor,
		ToEdgeNode:                FromSecondInhibitorToEdgeNode,
		MoveFromPrevInhibitor:     MoveChannelFromFirstToSecond,
		TransferFromPrevInhibitor: TransferSpawnedPartition,
	}

	l.Line = []any{&exn1, &i1, &edn1, &exn2, &i2}

}

func (l *Line) Input() {
	l.TestInput = []int{1, 1}
}
