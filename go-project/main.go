package main

import (
	"context"
	"sync"
	"time"

	L "github.com/dtauraso/congenial-octo-pancake/go-project/Line"
	S "github.com/dtauraso/congenial-octo-pancake/go-project/SafeWorker"
)

func RunTest() {
	l := L.Line{}
	l.Setup()
	l.Input()
	ctx, cancel := context.WithCancel(context.Background())
	wg := new(sync.WaitGroup)
	wg.Add(len(l.Line))
	s := S.SafeWorker{Ctx: ctx, Wg: wg}

	for _, node := range l.Line {
		go node.Update(&s)
	}
	for _, input := range l.TestInput {
		l.InputNode.Count += input
	}
	time.Sleep(100 * time.Millisecond)
	cancel()
	wg.Wait()
}

func main() {
	RunTest()
}
