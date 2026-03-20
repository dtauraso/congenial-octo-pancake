package StreakDetector

import (
	"fmt"
	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
)

type StreakDetector struct {
	Id                   int
	LeftValue            int
	HasLeft              bool
	RightValue           int
	HasRight             bool
	FromCurrentInhibitor <-chan int
	FromNextInhibitor    <-chan int
	FromPrevDetector     <-chan int
	ToNextDetector       chan<- int
}

func (sd *StreakDetector) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		select {
		case value := <-sd.FromCurrentInhibitor:
			fmt.Printf("sd%d: received %d from current\n", sd.Id, value)
			sd.LeftValue = value
			sd.HasLeft = true
		default:
		}

		select {
		case value := <-sd.FromNextInhibitor:
			fmt.Printf("sd%d: received %d from next\n", sd.Id, value)
			sd.RightValue = value
			sd.HasRight = true
		default:
		}

		select {
		case value := <-sd.FromPrevDetector:
			fmt.Printf("sd%d: received %d from prev detector\n", sd.Id, value)
		default:
		}

		if sd.HasLeft && sd.HasRight {
			// Detect streak: 00 or 11
			result := 0
			if (sd.LeftValue == 1 && sd.RightValue == 1) || (sd.LeftValue == 0 && sd.RightValue == 0) {
				result = 1
			}
			fmt.Printf("sd%d: streak(%d,%d) = %d (streak=%v)\n", sd.Id, sd.LeftValue, sd.RightValue, result, result == 1)
			S.Send(sd.ToNextDetector, result)
			sd.HasLeft = false
			sd.HasRight = false
		}
	}
}
