package EdgeNode

import (
	"context"
	"fmt"
	"sync"
)

type EdgeNode struct {
	Id                  int
	FromFirstInhibitor  <-chan int
	ToFirstInhibitor    chan<- int
	FromSecondInhibitor <-chan int
	EdgeFlag            int
}

func (en *EdgeNode) Update(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()
	for {
		fmt.Printf("Ed was called\n")
		select {
		case <-ctx.Done():
			return
		case value := <-en.FromFirstInhibitor:
			fmt.Printf("Ed1 was run: %d\n", value)
			en.EdgeFlag ^= value
		case value := <-en.FromSecondInhibitor:
			fmt.Printf("Ed2 was run: %d\n", value)
			en.EdgeFlag ^= value

		}
		fmt.Printf("edge flag: %d\n", en.EdgeFlag)
		switch en.EdgeFlag {
		case 1:
			en.ToFirstInhibitor <- 1
			fmt.Printf("Ed3 was run\n")
		}
	}
}
