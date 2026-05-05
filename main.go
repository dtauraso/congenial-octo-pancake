package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"sync"
	"time"

	S "github.com/dtauraso/wirefold/nodes/SafeWorker"
	T "github.com/dtauraso/wirefold/Trace"
	W "github.com/dtauraso/wirefold/nodes/Wiring"
)

// RunTest wires the topology and lets it run for `dur` before
// cancelling. If tracePath is non-empty, a Trace recorder is attached
// to SafeWorker and its raw event stream is dumped as JSON-lines to
// the path on shutdown. Raw form keys send events by (node, port);
// the canonical edge-keyed form requires a spec-aware Resolve step
// (cmd/topogen ground; out of scope for the runtime entrypoint).
func RunTest(dur time.Duration, tracePath string) {
	nodes := W.Wire()
	ctx, cancel := context.WithCancel(context.Background())
	wg := new(sync.WaitGroup)
	wg.Add(len(nodes))

	var tr *T.Trace
	if tracePath != "" {
		tr = T.New(0)
	}
	s := S.SafeWorker{Ctx: ctx, Wg: wg, Trace: tr}

	for _, node := range nodes {
		go node.Update(&s)
	}
	time.Sleep(dur)
	cancel()
	wg.Wait()

	if tr != nil {
		tr.Close()
		f, err := os.Create(tracePath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "trace write: %v\n", err)
			return
		}
		defer f.Close()
		if err := tr.WriteJSONL(f); err != nil {
			fmt.Fprintf(os.Stderr, "trace write: %v\n", err)
		}
	}
}

func main() {
	tracePath := flag.String("trace", "", "if set, write a raw JSONL trace to this path on shutdown")
	dur := flag.Duration("duration", 100*time.Millisecond, "how long to run before cancelling")
	flag.Parse()
	RunTest(*dur, *tracePath)
}
