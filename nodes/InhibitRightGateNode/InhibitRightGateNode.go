package InhibitRightGateNode

import (
	"fmt"

	S "github.com/dtauraso/wirefold/nodes/SafeWorker"
)

type InhibitRightGateNode struct {
	Id       int
	Name     string
	Left     int
	HasLeft  bool
	Right    int
	HasRight bool
	FromLeft  <-chan int
	FromRight <-chan int
	ToOut     chan<- int
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
				s.Trace.Recv(g.Name, "left", v)
			default:
			}
		}

		if !g.HasRight {
			select {
			case v := <-g.FromRight:
				g.Right = v
				g.HasRight = true
				s.Trace.Recv(g.Name, "right", v)
			default:
			}
		}

		if g.HasLeft && g.HasRight {
			result := 0
			if g.Left == 1 && g.Right == 0 {
				result = 1
			}
			fmt.Printf("%s: left=%d right=%d → %d\n", g.Name, g.Left, g.Right, result)
			s.Trace.Fire(g.Name)
			S.Send(g.ToOut, result)
			s.Trace.Send(g.Name, "out", result)
			g.HasLeft = false
			g.HasRight = false
		}
	}
}
