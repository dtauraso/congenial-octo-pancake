package EdgeNode

import "github.com/dtauraso/wirefold/nodes/Wiring"

func init() {
	Wiring.Register("Edge", func() any { return &EdgeNode{} }, nil)
}
