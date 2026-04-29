package InhibitRightGateNode

import (
	"fmt"

	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
)

type InhibitRightGateNode struct {
	Id       int
	Left     int
	HasLeft  bool
	Right    int
	HasRight bool
	FromLeft  <-chan int
	FromRight <-chan int
	ToOut     chan<- int
	ToAck     chan<- int
}

func (g *InhibitRightGateNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		if !g.HasLeft {
			select {
			case v := <-g.FromLeft:
				g.Left = v
				g.HasLeft = true
			default:
			}
		}

		if !g.HasRight {
			select {
			case v := <-g.FromRight:
				g.Right = v
				g.HasRight = true
			default:
			}
		}

		if g.HasLeft && g.HasRight {
			result := 0
			if g.Left == 1 && g.Right == 0 {
				result = 1
			}
			fmt.Printf("inhibitRightGate%d: left=%d right=%d → %d\n", g.Id, g.Left, g.Right, result)
			S.Send(g.ToOut, result)
			S.Send(g.ToAck, 1)
			g.HasLeft = false
			g.HasRight = false
		}
	}
}
