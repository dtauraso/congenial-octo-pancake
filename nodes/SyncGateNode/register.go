package SyncGateNode

import "github.com/dtauraso/wirefold/nodes/Wiring"

func init() {
	Wiring.Register("SyncGate", func() any { return &SyncGateNode{} }, nil)
}
