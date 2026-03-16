package InputNode

import (
	"fmt"
	S "github.com/dtauraso/congenial-octo-pancake/go-project/SafeWorker"
)

type InputNode struct {
	Id     int
	Input  <-chan int
	ToNext chan<- int
}

func (n *InputNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		select {
		case value := <-n.Input:
			fmt.Printf("in%d: sending %d\n", n.Id, value)
			n.ToNext <- value
		default:
		}
	}
}
