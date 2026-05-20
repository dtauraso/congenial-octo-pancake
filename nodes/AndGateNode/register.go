package AndGateNode

import "github.com/dtauraso/wirefold/nodes/Wiring"

func init() {
	Wiring.Register("AndGate", func() any { return &AndGateNode{} }, nil)
}
