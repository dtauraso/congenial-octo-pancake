package ReadLatchNode

import "github.com/dtauraso/wirefold/nodes/Wiring"

func init() {
	Wiring.Register("ReadLatch", func() any { return &ReadLatchNode{} }, nil)
}
