package StreakDetector

import (
	"fmt"
	CAN "github.com/dtauraso/congenial-octo-pancake/CascadeAndGateNode"
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
	ToSync               chan<- int
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
			// Detect streak: -1,-1 or 1,1
			result := 0
			if (sd.LeftValue == 1 && sd.RightValue == 1) || (sd.LeftValue == -1 && sd.RightValue == -1) {
				result = 1
			}
			fmt.Printf("sd%d: streak(%d,%d) = %d (streak=%v)\n", sd.Id, sd.LeftValue, sd.RightValue, result, result == 1)
			S.Send(sd.ToNextDetector, result)
			S.Send(sd.ToSync, 1)
			sd.HasLeft = false
			sd.HasRight = false
		}
	}
}

func (sd *StreakDetector) moveRight(s *S.SafeWorker) {
	i1 := sd.CurrentInhibitor
	fmt.Printf("sd%d: moving right from i%d\n", sd.Id, i1.Id)

	// Create new inhibitor
	newNode := CI.NewChainInhibitorNode(i1.Id+1, nil, nil)
	i2 := &newNode

	// Create sync gate between i1 and i2
	i1ToSync := make(chan int, 1)
	syncToI2 := make(chan int, 1)
	sbdDoneToSync := make(chan int, 1)
	sdDoneToSync := make(chan int, 1)

	syncId := i1.Id // sync1 sits after i1
	sync1 := &CAN.CascadeAndGateNode{Id: syncId, FromValue: i1ToSync, FromLeft: sbdDoneToSync, FromRight: sdDoneToSync, ToNext: syncToI2}

	// Wire i1 -> sync -> i2 chain
	i1.ToNext = i1ToSync
	i2.FromPrev = syncToI2
	i2.ToNext = make(chan int, 3)

	// Wire done signals from detectors to sync gate
	sd.StreakBreakDetector.ToSync = sbdDoneToSync
	sd.ToSync = sdDoneToSync

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

	// Start sync1 and i2 goroutines
	s.Wg.Add(2)
	go sync1.Update(s)
	go i2.Update(s)

	fmt.Printf("sd%d: created sync%d and i%d, rewired sbd%d and sd%d\n", sd.Id, syncId, i2.Id, sd.StreakBreakDetector.Id, sd.Id)
}
