package EdgeNode

import (
	"fmt"
	S "github.com/dtauraso/wirefold/SafeWorker"
)

type EdgeNode struct {
	Id                   int
	LeftValue            int
	HasLeft              bool
	RightValue           int
	HasRight             bool
	FromCurrentInhibitor <-chan int
	ToCurrentInhibitor   chan<- int
	FromNextInhibitor    <-chan int
	ToPartition          chan<- int
	FromPrevEdge         <-chan int
	ToNextEdge           chan<- int
}

func (en *EdgeNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		default:
		}

		select {
		case value := <-en.FromCurrentInhibitor:
			fmt.Printf("edn%d: received %d from current\n", en.Id, value)
			en.LeftValue = value
			en.HasLeft = true
		default:
		}

		select {
		case value := <-en.FromNextInhibitor:
			fmt.Printf("edn%d: received %d from next\n", en.Id, value)
			en.RightValue = value
			en.HasRight = true
		default:
		}

		select {
		case value := <-en.FromPrevEdge:
			fmt.Printf("edn%d: received %d from prev edge\n", en.Id, value)
		default:
		}

		if en.HasLeft && en.HasRight {
			result := en.LeftValue ^ en.RightValue
			fmt.Printf("edn%d: %d XOR %d = %d\n", en.Id, en.LeftValue, en.RightValue, result)
			S.Send(en.ToCurrentInhibitor, result)
			S.Send(en.ToPartition, result)
			S.Send(en.ToNextEdge, result)
			en.HasLeft = false
			en.HasRight = false
		}
	}
}
