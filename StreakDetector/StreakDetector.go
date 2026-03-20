package StreakDetector

import (
	"fmt"
	CI "github.com/dtauraso/congenial-octo-pancake/ChainInhibitorNode"
	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
	SBD "github.com/dtauraso/congenial-octo-pancake/StreakBreakDetector"
)

type StreakDetector struct {
	Id                   int
	LeftValue            int
	HasLeft              bool
	RightValue           int
	HasRight             bool
	CurrentInhibitor     *CI.ChainInhibitorNode
	StreakBreakDetector   *SBD.StreakBreakDetector
	SbdNextChan          chan<- int
	SdNextChan           chan<- int
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
			if value == 1 && sd.CurrentInhibitor != nil && sd.StreakBreakDetector != nil {
				sd.moveRight(s)
			}
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

func (sd *StreakDetector) moveRight(s *S.SafeWorker) {
	i1 := sd.CurrentInhibitor
	fmt.Printf("sd%d: moving right from i%d\n", sd.Id, i1.Id)

	// Create new inhibitor
	i2 := &CI.ChainInhibitorNode{Id: i1.Id + 1}

	// Create i1 -> i2 chain channel
	i1ToI2 := make(chan int, 1)
	i1.ToNext = i1ToI2
	i2.FromPrev = i1ToI2
	i2.ToNext = make(chan int, 3)

	// Create new channels from i2 to detectors
	i2ToSbd := make(chan int, 1)
	i2ToSd := make(chan int, 1)

	// Rewire sbd1's right input from i1 to i2
	sd.StreakBreakDetector.FromNextInhibitor = i2ToSbd

	// Rewire sd1's right input from i1 to i2
	sd.FromNextInhibitor = i2ToSd

	// Remove old send-end channels from i1.ToEdge
	newToEdge := make([]chan<- int, 0, len(i1.ToEdge))
	for _, ch := range i1.ToEdge {
		if ch != sd.SbdNextChan && ch != sd.SdNextChan {
			newToEdge = append(newToEdge, ch)
		}
	}
	i1.ToEdge = newToEdge

	// Set i2's edge channels
	i2.ToEdge = []chan<- int{i2ToSbd, i2ToSd}

	// Update send-end references for future moves
	sd.SbdNextChan = i2ToSbd
	sd.SdNextChan = i2ToSd

	// Update pointer to new current inhibitor
	sd.CurrentInhibitor = i2

	// Start i2's goroutine
	s.Wg.Add(1)
	go i2.Update(s)

	fmt.Printf("sd%d: created i%d, rewired sbd%d and sd%d\n", sd.Id, i2.Id, sd.StreakBreakDetector.Id, sd.Id)
}
