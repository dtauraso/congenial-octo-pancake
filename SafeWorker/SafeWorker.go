package SafeWorker

import (
	"context"
	"sync"

	tr "github.com/dtauraso/wirefold/Trace"
)

type SafeWorker struct {
	Ctx context.Context
	Wg  *sync.WaitGroup
	// Trace is the shared recorder. Nil for untraced runs (production
	// or tests that don't care about event order). When non-nil, every
	// node Update emits recv/fire/send events via Trace.Recv / Fire /
	// Send. The pointer is shared across all nodes, so the event order
	// reflects the actual concurrent interleaving the Go scheduler
	// produced — which is what trace replay wants.
	Trace *tr.Trace
}

var Grow int = 1

type Node interface {
	Update(s *SafeWorker)
}

func Send[T any](ch chan<- T, val T) {
	select {
	case ch <- val:
	default:
	}
}
