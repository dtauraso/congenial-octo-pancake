package AndGateNode

import (
	"fmt"
	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
)

type AndGateNode struct {
	Id         int
	LeftValue  int
	HasLeft    bool
	RightValue int
	HasRight   bool
	FromLeft   <-chan int
	FromRight  <-chan int
	ToNext     chan<- int
}

func (a *AndGateNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		select {
		case left := <-a.FromLeft:
			a.LeftValue = left
			a.HasLeft = true
		default:
		}

		select {
		case right := <-a.FromRight:
			a.RightValue = right
			a.HasRight = true
		default:
		}

		if a.HasLeft && a.HasRight {
			result := a.LeftValue & a.RightValue
			fmt.Printf("a%d: %d AND %d = %d\n", a.Id, a.LeftValue, a.RightValue, result)
			S.Send(a.ToNext, result)
			if a.FromLeft != nil {
				a.HasLeft = false
			}
			if a.FromRight != nil {
				a.HasRight = false
			}
		}
	}
}
