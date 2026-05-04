// Phase 8 Chunk 1 — AndGate cross-language fixture parity.
//
// Same shape as FixtureParity_test.go (the chain-cascade parity
// test): runs an AndGate join through the Go runtime + Trace +
// resolver, asserts the canonical projection matches the bytes of
// tools/topology-vscode/test/fixtures/and-gate.trace.jsonl.
//
// Comparison rules: multiset equality on projection keys, plus per-
// node ordering (recv before fire before send). Total ordering is
// not asserted — Go's scheduler is concurrent, TS is deterministic
// FIFO, both are correct executions of the same spec.

package Trace_test

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	AG "github.com/dtauraso/wirefold/AndGateNode"
	S "github.com/dtauraso/wirefold/SafeWorker"
	. "github.com/dtauraso/wirefold/Trace"
)

func TestParity_FixtureMatch_AndGate(t *testing.T) {
	fixturePath := filepath.Join("..", "tools", "topology-vscode", "test", "fixtures", "and-gate.trace.jsonl")
	raw, err := os.ReadFile(fixturePath)
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	type canonicalLine struct {
		Step  int    `json:"step"`
		Kind  string `json:"kind"`
		Node  string `json:"node,omitempty"`
		Port  string `json:"port,omitempty"`
		Edge  string `json:"edge,omitempty"`
		Value int    `json:"value,omitempty"`
	}
	var want []canonicalLine
	for i, line := range strings.Split(strings.TrimRight(string(raw), "\n"), "\n") {
		if line == "" {
			continue
		}
		var c canonicalLine
		if err := json.Unmarshal([]byte(line), &c); err != nil {
			t.Fatalf("fixture line %d: %v", i+1, err)
		}
		want = append(want, c)
	}

	// Only ag.out is a live edge; srcA/srcB are stand-ins for the TS
	// Input seeds and don't run as Go nodes here. Sink has no handler,
	// so the canonical fixture has no recv on sink — matches.
	em := BuildEdgeMap([]EdgeLite{
		{ID: "agOut", SourceNode: "ag", SourceHandle: "out"},
	})

	tr := New(64)

	aIn := make(chan int, 1)
	bIn := make(chan int, 1)
	agOut := make(chan int, 1)

	ag := AG.AndGateNode{Name: "ag", FromA: aIn, FromB: bIn, ToOut: agOut}

	ctx, cancel := context.WithCancel(context.Background())
	wg := new(sync.WaitGroup)
	wg.Add(1)
	s := S.SafeWorker{Ctx: ctx, Wg: wg, Trace: tr}
	go ag.Update(&s)

	// Stand in for the TS seeds: srcA/srcB pulse 1 at ticks 0 and 1.
	// The brief sleep guarantees ag observes `a` before `b` so the
	// per-node ordering check below is well-defined; multiset equality
	// would pass either way.
	aIn <- 1
	time.Sleep(2 * time.Millisecond)
	bIn <- 1

	select {
	case v := <-agOut:
		if v != 1 {
			t.Fatalf("agOut got %d, want 1", v)
		}
	case <-time.After(200 * time.Millisecond):
		t.Fatal("agOut never received the joined value")
	}
	cancel()
	wg.Wait()
	tr.Close()

	canonical := Resolve(tr.Events(), em)

	project := func(kind, node, port, edge string, value int) string {
		switch kind {
		case "recv":
			return "recv:" + node + "/" + port + "=" + itoaSigned(value)
		case "fire":
			return "fire:" + node
		case "send":
			return "send:" + edge + "=" + itoaSigned(value)
		}
		return ""
	}

	wantKeys := map[string]int{}
	for _, c := range want {
		wantKeys[project(c.Kind, c.Node, c.Port, c.Edge, c.Value)]++
	}
	gotKeys := map[string]int{}
	for _, e := range canonical {
		gotKeys[project(e.Kind, e.Node, e.Port, e.Edge, e.Value)]++
	}
	for k, n := range wantKeys {
		if gotKeys[k] != n {
			t.Errorf("projection %q: got %d, want %d", k, gotKeys[k], n)
		}
	}
	for k, n := range gotKeys {
		if wantKeys[k] == 0 {
			t.Errorf("unexpected projection %q (count %d)", k, n)
		}
	}
	if t.Failed() {
		t.Logf("got canonical: %+v", canonical)
		t.Logf("want fixture:  %+v", want)
	}

	type seen struct{ recv, fire, send int }
	per := map[string]*seen{}
	for i, e := range canonical {
		ps := per[e.Node]
		if ps == nil {
			ps = &seen{recv: -1, fire: -1, send: -1}
			per[e.Node] = ps
		}
		switch e.Kind {
		case KindRecv:
			if ps.recv < 0 {
				ps.recv = i
			}
		case KindFire:
			if ps.fire < 0 {
				ps.fire = i
			}
		case KindSend:
			if ps.send < 0 {
				ps.send = i
			}
		}
	}
	if ps := per["ag"]; ps == nil || !(ps.recv < ps.fire && ps.fire < ps.send) {
		t.Errorf("ag: per-node order broken: %+v", ps)
	}
}

// Local copy — FixtureParity_test.go's itoa is package-private to that
// file's test.
func itoaSigned(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}
