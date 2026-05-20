package StreakBreakDetector

import "github.com/dtauraso/wirefold/nodes/Wiring"

func init() {
	Wiring.Register("StreakBreakDetector", func() any { return &StreakBreakDetector{} }, nil)
}
