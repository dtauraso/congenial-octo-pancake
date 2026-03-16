package EdgeNode

import (
	"fmt"
	S "github.com/dtauraso/congenial-octo-pancake/go-project/SafeWorker"
)

type EdgeNode struct {
	Id                   int
	FromCurrentInhibitor <-chan int
	ToCurrentInhibitor   chan<- int
	FromNextInhibitor    <-chan int
	ToPartition          chan<- int
	EdgeFlag             int
}

func (en *EdgeNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		select {
		case <-s.Ctx.Done():
			return
		case value := <-en.FromCurrentInhibitor:
			fmt.Printf("edn%d: received %d from current\n", en.Id, value)
			en.EdgeFlag ^= value
		case value := <-en.FromNextInhibitor:
			fmt.Printf("edn%d: received %d from next\n", en.Id, value)
			en.EdgeFlag ^= value
		}
		fmt.Printf("edn%d: flag=%d\n", en.Id, en.EdgeFlag)
		S.Send(en.ToCurrentInhibitor, en.EdgeFlag)
		S.Send(en.ToPartition, en.EdgeFlag)
		fmt.Printf("edn%d: sent flag to inhibitor and partition\n", en.Id)
	}
}
