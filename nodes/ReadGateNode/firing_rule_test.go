package ReadGateNode

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

// FiresWhenBothPresent: value from FromInput is forwarded on ToChainInhibitor
// when FromChainInhibitor also arrives; inhibitor value is ignored.
func TestFiresWhenBothPresent(t *testing.T) {
	fromInput := make(chan int, 1)
	fromCI := make(chan int, 1)
	toCI := make(chan int, 1)

	node := &ReadGateNode{
		Name:               "rg",
		FromInput:          fromInput,
		FromChainInhibitor: fromCI,
		ToChainInhibitor:   toCI,
	}

	ctx, cancel := context.WithCancel(context.Background())
	sw := newWorker(ctx)
	go node.Update(sw)

	fromInput <- 42
	fromCI <- 1
	got := recv(t, toCI)
	cancel()
	sw.Wg.Wait()

	if got != 42 {
		t.Fatalf("expected 42, got %d", got)
	}
}

// NoFireWithoutInhibitor: value alone must not emit.
func TestNoFireWithoutInhibitor(t *testing.T) {
	fromInput := make(chan int, 1)
	fromCI := make(chan int, 1)
	toCI := make(chan int, 1)

	node := &ReadGateNode{
		Name:               "rg",
		FromInput:          fromInput,
		FromChainInhibitor: fromCI,
		ToChainInhibitor:   toCI,
	}

	ctx, cancel := context.WithCancel(context.Background())
	sw := newWorker(ctx)
	go node.Update(sw)

	fromInput <- 7
	time.Sleep(20 * time.Millisecond)
	cancel()
	sw.Wg.Wait()

	select {
	case v := <-toCI:
		t.Fatalf("unexpected emission %d", v)
	default:
	}
}
