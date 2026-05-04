// Phase 8 Chunk 2 — StreakDetector on the Go side.
//
// Mirrors the TS handler in src/sim/handlers.ts (sdJoin):
//   buffer one input on `old` or `new`; when both buffered, emit
//   done=1 always and streak = (sign(old) == sign(new)) ? 1 : 0,
//   then clear. Sign treats v>=1 as positive (matches the signed-
//   edge convention shared with StreakBreakDetector).

package StreakDetector

import (
	S "github.com/dtauraso/wirefold/SafeWorker"
)

type StreakDetector struct {
	Id       int
	Name     string
	FromOld  <-chan int
	FromNew  <-chan int
	ToDone   chan<- int
	ToStreak chan<- int

	old, new       int
	hasOld, hasNew bool
}

func (n *StreakDetector) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		if !n.hasOld {
			select {
			case v := <-n.FromOld:
				n.old = v
				n.hasOld = true
				s.Trace.Recv(n.Name, "old", v)
			default:
			}
		}

		if !n.hasNew {
			select {
			case v := <-n.FromNew:
				n.new = v
				n.hasNew = true
				s.Trace.Recv(n.Name, "new", v)
			default:
			}
		}

		if n.hasOld && n.hasNew {
			streak := 0
			if (n.old >= 1) == (n.new >= 1) {
				streak = 1
			}
			s.Trace.Fire(n.Name)
			S.Send(n.ToDone, 1)
			s.Trace.Send(n.Name, "done", 1)
			S.Send(n.ToStreak, streak)
			s.Trace.Send(n.Name, "streak", streak)
			n.hasOld = false
			n.hasNew = false
		}
	}
}
