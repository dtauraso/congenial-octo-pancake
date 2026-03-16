package main

import (
	"context"
	"sync"
	"time"

	D "github.com/dtauraso/congenial-octo-pancake/go-project/DistributeNode"
	EdN "github.com/dtauraso/congenial-octo-pancake/go-project/EdgeNode"
	IN "github.com/dtauraso/congenial-octo-pancake/go-project/InhibitorNode"
	L "github.com/dtauraso/congenial-octo-pancake/go-project/Line"
	PN "github.com/dtauraso/congenial-octo-pancake/go-project/PartitionNode"
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
		switch node := node.(type) {
		case *IN.InhibitorNode:
			go node.Update(&s)
		case *EdN.EdgeNode:
			go node.Update(&s)
		case *PN.PartitionNode:
			go node.Update(&s)
		case *D.DistributeNode:
			go node.Update(ctx, wg)
		}
	}
	for _, input := range l.TestInput {
		switch x := l.Line[0].(type) {
		case *IN.InhibitorNode:
			x.Count += input
		}
	}
	time.Sleep(100 * time.Millisecond)
	cancel()
	wg.Wait()
}

func main() {
	RunTest()
}
