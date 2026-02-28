package ExcitatoryNode

import (
	"fmt"
	S "github.com/dtauraso/congenial-octo-pancake/go-project/SafeWorker"
)

type ExcitatoryNode struct {
	Id            int
	Count         int        ///
	ToInhibitor   chan<- int ///
	FromInhibitor <-chan int ///
}

func (en *ExcitatoryNode) Update(s *S.SafeWorker) {
	defer s.Wg.Done()
	for {
		fmt.Printf("E was called\n")
		S.Send(s, en.ToInhibitor, en.Count)
		select {
		case <-s.Ctx.Done():
			return
		case value := <-en.FromInhibitor:
			fmt.Printf("%dE: value: %d\n", en.Id, value)
			en.Count += value ///
			fmt.Printf("%dE: count: %d\n", en.Id, en.Count)
		}
	}

}
func Run() {
	fmt.Println("Process started")
}
