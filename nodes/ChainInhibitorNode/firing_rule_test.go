package ChainInhibitorNode

import (
	"context"
	"sync"
	"testing"
	"time"

	S "github.com/dtauraso/wirefold/nodes/SafeWorker"
)

func newWorker(ctx context.Context) *S.SafeWorker {
	wg := &sync.WaitGroup{}
	wg.Add(1)
	return &S.SafeWorker{Ctx: ctx, Wg: wg, Trace: nil}
}

func recv(t *testing.T, ch <-chan int) int {
	t.Helper()
	select {
	case v := <-ch:
		return v
	case <-time.After(100 * time.Millisecond):
		t.Fatal("timeout waiting for output")
		return 0
	}
}

// On receive, emit HeldValue downstream then hold the new value and release ReadGate.
func TestFireOnReceive(t *testing.T) {
	fromPrev := make(chan int, 1)
	toNext := make(chan int, 1)
	toReadGate := make(chan int, 1)
	toEdge := make(chan int, 1)

	node := &ChainInhibitorNode{
		Name:                       "ci",
		HeldValue:                  99,
		FromPrevChainInhibitorNode: fromPrev,
		ToNextChainInhibitorNode:   toNext,
		ToReadGate:                 toReadGate,
		ToEdge:                     []chan<- int{toEdge},
	}

	ctx, cancel := context.WithCancel(context.Background())
	sw := newWorker(ctx)
	go node.Update(sw)

	fromPrev <- 7
	gotEdge := recv(t, toEdge)
	gotNext := recv(t, toNext)
	gotRG := recv(t, toReadGate)
	cancel()
	sw.Wg.Wait()

	// HeldValue (99) goes to edge and next; new value (7) is stored.
	if gotEdge != 99 {
		t.Errorf("ToEdge: expected 99, got %d", gotEdge)
	}
	if gotNext != 99 {
		t.Errorf("ToNextChainInhibitorNode: expected 99, got %d", gotNext)
	}
	if gotRG != 1 {
		t.Errorf("ToReadGate: expected 1, got %d", gotRG)
	}
	if node.HeldValue != 7 {
		t.Errorf("HeldValue after fire: expected 7, got %d", node.HeldValue)
	}
}
