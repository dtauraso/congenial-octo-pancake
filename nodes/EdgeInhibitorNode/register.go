package EdgeInhibitorNode

import "github.com/dtauraso/wirefold/nodes/Wiring"

func init() {
	Wiring.Register("EdgeInhibitor", func() any { return &EdgeInhibitorNode{} }, nil)
}
