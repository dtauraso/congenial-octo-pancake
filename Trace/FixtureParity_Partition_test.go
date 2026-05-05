// Phase 8 Chunk 6 — Partition cross-language fixture parity.
//
// Drives two value=1 inputs through a Partition (NotInit → Growing
// → Stopped); fixture has two recv/fire/send triplets, one per
// transition. Same multiset + per-node ordering shape as the prior
// chunks; per-node ordering is checked as "first recv before first
// fire before first send" which is the strongest claim that holds
// under either possible interleaving.

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

	P "github.com/dtauraso/wirefold/nodes/PartitionNode"
	S "github.com/dtauraso/wirefold/nodes/SafeWorker"
	. "github.com/dtauraso/wirefold/Trace"
)

func TestParity_FixtureMatch_Partition(t *testing.T) {
	fixturePath := filepath.Join("..", "tools", "topology-vscode", "test", "fixtures", "partition.trace.jsonl")
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

	em := BuildEdgeMap([]EdgeLite{
		{ID: "pOut", SourceNode: "p", SourceHandle: "out"},
	})

	tr := New(64)

	in := make(chan int, 1)
	out := make(chan int, 1)

	pn := P.PartitionNode{Name: "p", FromIn: in, ToOut: out}

	ctx, cancel := context.WithCancel(context.Background())
	wg := new(sync.WaitGroup)
	wg.Add(1)
	s := S.SafeWorker{Ctx: ctx, Wg: wg, Trace: tr}
	go pn.Update(&s)

	// Two transitions: NotInit→Growing (emits 1), Growing→Stopped
	// (emits 0). The buffer-1 channel + drain-after-each pattern
	// guarantees the first input is consumed and the first emission
	// is produced before the second input is sent.
	in <- 1
	if v := <-out; v != 1 {
		t.Fatalf("first transition: got %d, want 1", v)
	}
	in <- 1
	if v := <-out; v != 0 {
		t.Fatalf("second transition: got %d, want 0", v)
	}

	// Tiny grace so the trace `send` for the second transition has
	// a chance to land before we cancel and Close. Without it the
	// final Send/Trace.Send race could miss the trailing event.
	time.Sleep(2 * time.Millisecond)
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
	if ps := per["p"]; ps == nil || !(ps.recv < ps.fire && ps.fire < ps.send) {
		t.Errorf("p: per-node order broken: %+v", ps)
	}
}
