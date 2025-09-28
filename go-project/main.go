package main

import (
	"context"
	"sync"
	"time"

	EdN "github.com/dtauraso/congenial-octo-pancake/go-project/EdgeNode"
	ExN "github.com/dtauraso/congenial-octo-pancake/go-project/ExcitatoryNode"
	IN "github.com/dtauraso/congenial-octo-pancake/go-project/InhibitorNode"
	L "github.com/dtauraso/congenial-octo-pancake/go-project/Line"
	PN "github.com/dtauraso/congenial-octo-pancake/go-project/PartitionNode"
)

func RunTest() {
	l := L.Line{}
	l.Setup()
	l.Input()
	ctx, cancel := context.WithCancel(context.Background())
	wg := new(sync.WaitGroup)
	wg.Add(len(l.Line))

	for _, node := range l.Line {
		switch node := node.(type) {
		case *ExN.ExcitatoryNode:
			go node.Update(ctx, wg)
		case *IN.InhibitorNode:
			go node.Update(ctx, wg)
		case *EdN.EdgeNode:
			go node.Update(ctx, wg)
		case *PN.PartitionNode:
			go node.Update(ctx, wg)
		}
	}
	for _, input := range l.TestInput {
		switch x := l.Line[0].(type) {
		case *ExN.ExcitatoryNode:
			x.Count += input
		}
	}
	time.Sleep(time.Millisecond)
	cancel()
	wg.Wait()
}

func main() {
	RunTest()
}
