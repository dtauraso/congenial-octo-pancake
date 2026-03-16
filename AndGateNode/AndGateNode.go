package AndGateNode

import (
	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
)

type AndGateNode struct {
	Id int
}

func (a *AndGateNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}
	}
}
