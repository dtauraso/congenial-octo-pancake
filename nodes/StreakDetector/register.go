package StreakDetector

import "github.com/dtauraso/wirefold/nodes/Wiring"

func init() {
	Wiring.Register("StreakDetector", func() any { return &StreakDetector{} }, nil)
}
