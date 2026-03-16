package main

import (
	"context"
	"sync"
	"time"

	L "github.com/dtauraso/congenial-octo-pancake/Line"
	S "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
)

func RunTest() {
	l := L.Line{}
	l.Setup()
	ctx, cancel := context.WithCancel(context.Background())
	wg := new(sync.WaitGroup)
	wg.Add(len(l.Line))
	s := S.SafeWorker{Ctx: ctx, Wg: wg}

	for _, node := range l.Line {
		go node.Update(&s)
	}
	time.Sleep(10 * time.Millisecond)
	cancel()
	wg.Wait()
}

func main() {
	RunTest()
}
