package SafeWorker

import (
	"context"
	"sync"
)

type SafeWorker struct {
	Ctx context.Context
	Wg  *sync.WaitGroup
}

func Send[T any](w *SafeWorker, ch chan<- T, val T) {
	select {
	case ch <- val:
	default:
	}
}

