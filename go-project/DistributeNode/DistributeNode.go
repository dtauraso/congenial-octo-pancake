package DistributeNode

type DistributeNode struct {
	CanAddTimeline                    bool
	PartitionIsMade                   chan<- bool
	FromFirstNextInhibitor            <-chan int
	ToFirstNextInhibitor              chan<- int
	FromSecondNextInhibitor           <-chan int
	ToSecondNextInhibitor             chan<- int
	SelfReferenceToFirstNextInhibitor chan<- *DistributeNode
}
