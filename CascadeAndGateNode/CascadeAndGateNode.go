package CascadeAndGateNode

import (
	"fmt"
	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
)

type CascadeAndGateNode struct {
	Id          int
	HeldValue   int
	LeftSignal  int
	HasLeft     bool
	RightSignal int
	HasRight    bool
	FromValue   <-chan int
	FromLeft    <-chan int
	FromRight   <-chan int
	ToNext      chan<- int
}

func (a *CascadeAndGateNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		select {
		case value := <-a.FromValue:
			a.HeldValue = value
			fmt.Printf("ca%d: holding value %d\n", a.Id, a.HeldValue)
		default:
		}

		select {
		case left := <-a.FromLeft:
			a.LeftSignal = left
			a.HasLeft = true
		default:
		}

		select {
		case right := <-a.FromRight:
			a.RightSignal = right
			a.HasRight = true
		default:
		}

		if a.HasLeft && a.HasRight {
			result := a.LeftSignal & a.RightSignal
			fmt.Printf("ca%d: %d AND %d = %d\n", a.Id, a.LeftSignal, a.RightSignal, result)
			if result == 1 {
				fmt.Printf("ca%d: forwarding value %d\n", a.Id, a.HeldValue)
				S.Send(a.ToNext, a.HeldValue)
			}
			if a.FromLeft != nil {
				a.HasLeft = false
			}
			if a.FromRight != nil {
				a.HasRight = false
			}
		}
	}
}
