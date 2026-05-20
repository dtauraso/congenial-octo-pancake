package ReadGateNode

import "github.com/dtauraso/wirefold/nodes/Wiring"

func init() {
	Wiring.Register("ReadGate", func() any { return &ReadGateNode{} }, nil)
}
