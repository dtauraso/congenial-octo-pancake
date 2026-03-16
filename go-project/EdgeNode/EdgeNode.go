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
		fmt.Printf("Ed was called\n")
		select {
		case <-s.Ctx.Done():
			return
		case value := <-en.FromCurrentInhibitor:
			fmt.Printf("Ed1 was run: %d\n", value)
			en.EdgeFlag ^= value
		case value := <-en.FromNextInhibitor:
			fmt.Printf("Ed2 was run: %d\n", value)
			en.EdgeFlag ^= value

		}
		fmt.Printf("edge flag: %d\n", en.EdgeFlag)
		switch en.EdgeFlag {
		case 1:
			S.Send(en.ToCurrentInhibitor, 1)
			S.Send(en.ToPartition, 1)
			fmt.Printf("Ed3 was run\n")
		}
	}
}
