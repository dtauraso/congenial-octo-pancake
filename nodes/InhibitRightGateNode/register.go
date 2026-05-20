package InhibitRightGateNode

import "github.com/dtauraso/wirefold/nodes/Wiring"

func init() {
	Wiring.Register("InhibitRightGate", func() any { return &InhibitRightGateNode{} }, nil)
}
