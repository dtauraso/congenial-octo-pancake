package SafeWorker

import (
	"context"
	"sync"
)

type SafeWorker struct {
	Ctx context.Context
	Wg  *sync.WaitGroup
}

var Grow int = 1

type Node interface {
	Update(s *SafeWorker)
}

func Send[T any](w *SafeWorker, ch chan<- T, val T) {
	select {
	case ch <- val:
	default:
	}
}

