package DistributeNode

import (
	"fmt"
	S "github.com/dtauraso/wirefold/SafeWorker"
)

type DistributeNode struct {
	Id    int
	Input <-chan int
}

func (d *DistributeNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		fmt.Printf("%dI1 is being run\n", d.Id)
		select {
		case <-s.Ctx.Done():
			return
		default:
		}
	}
}
