package ExcitatoryNode

import (
	"context"
	"fmt"
	"sync"

)

type ExcitatoryNode struct {
	Id            int
	Count         int
	ToInhibitor   chan<- int
	FromInhibitor <-chan int
}

func (en *ExcitatoryNode) Update(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()
	for {
		fmt.Printf("E was called\n")
		en.ToInhibitor <- en.Count
		select {
		case <-ctx.Done():
			return
		case value := <-en.FromInhibitor:
			fmt.Printf("%dE: value: %d\n", en.Id, value)
			en.Count += value
			fmt.Printf("%dE: count: %d\n", en.Id, en.Count)
		}
	}

}
func Run() {
	fmt.Println("Process started")
}
