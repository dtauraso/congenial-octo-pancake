package main

import (
	"context"
	"sync"
	"time"

	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
	W "github.com/dtauraso/congenial-octo-pancake/Wiring"
)

func RunTest() {
	nodes := W.Wire()
	ctx, cancel := context.WithCancel(context.Background())
	wg := new(sync.WaitGroup)
	wg.Add(len(nodes))
	s := S.SafeWorker{Ctx: ctx, Wg: wg}

	for _, node := range nodes {
		go node.Update(&s)
	}
	time.Sleep(100 * time.Millisecond)
	cancel()
	wg.Wait()
}

func main() {
	RunTest()
}
