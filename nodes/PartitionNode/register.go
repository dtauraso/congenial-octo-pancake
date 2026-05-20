package PartitionNode

import "github.com/dtauraso/wirefold/nodes/Wiring"

func init() {
	Wiring.Register("Partition", func() any { return &PartitionNode{} }, nil)
}
