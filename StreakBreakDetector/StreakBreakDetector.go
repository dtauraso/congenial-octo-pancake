package StreakBreakDetector

import (
	"fmt"
	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
)

type StreakBreakDetector struct {
	Id                   int
	LeftValue            int
	HasLeft              bool
	RightValue           int
	HasRight             bool
	FromCurrentInhibitor <-chan int
	ToCurrentInhibitor   chan<- int
	FromNextInhibitor    <-chan int
	ToPartition          chan<- int
}

func (sbd *StreakBreakDetector) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		select {
		case value := <-sbd.FromCurrentInhibitor:
			fmt.Printf("sbd%d: received %d from current\n", sbd.Id, value)
			sbd.LeftValue = value
			sbd.HasLeft = true
		default:
		}

		select {
		case value := <-sbd.FromNextInhibitor:
			fmt.Printf("sbd%d: received %d from next\n", sbd.Id, value)
			sbd.RightValue = value
			sbd.HasRight = true
		default:
		}

		if sbd.HasLeft && sbd.HasRight {
			// Detect streak break: 10 or 01
			result := 0
			if (sbd.LeftValue == 1 && sbd.RightValue == 0) || (sbd.LeftValue == 0 && sbd.RightValue == 1) {
				result = 1
			}
			fmt.Printf("sbd%d: streakBreak(%d,%d) = %d (streak break=%v)\n", sbd.Id, sbd.LeftValue, sbd.RightValue, result, result == 1)
			S.Send(sbd.ToCurrentInhibitor, result)
			S.Send(sbd.ToPartition, result)
			sbd.HasLeft = false
			sbd.HasRight = false
		}
	}
}
