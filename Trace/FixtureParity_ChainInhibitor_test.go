// Phase 8 Chunk 9b — ChainInhibitor cross-language fixture parity.
//
// Same shape as FixtureParity_AndGate_test.go: runs a single
// ChainInhibitorNode through the Go runtime + Trace + resolver,
// asserts the canonical projection matches the bytes of
// tools/topology-vscode/test/fixtures/chain-inhibitor.trace.jsonl.
//
// Multi-output node: one slot for ToEdge (inhibitOut) and one slot
// for ToEdgeNew (readNew), plus the always-present ToNext (out) and
// ToAck (ack). Send order in the Go node is ToEdge → ToEdgeNew →
// ToNext → ToAck; the fixture pins that same order.

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

	CI "github.com/dtauraso/wirefold/nodes/ChainInhibitorNode"
	S "github.com/dtauraso/wirefold/nodes/SafeWorker"
	. "github.com/dtauraso/wirefold/Trace"
)

func TestParity_FixtureMatch_ChainInhibitor(t *testing.T) {
	fixturePath := filepath.Join("..", "tools", "topology-vscode", "test", "fixtures", "chain-inhibitor.trace.jsonl")
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
		{ID: "ciInhibit", SourceNode: "ci", SourceHandle: "inhibitOut"},
		{ID: "ciReadNew", SourceNode: "ci", SourceHandle: "readNew"},
		{ID: "ciOut", SourceNode: "ci", SourceHandle: "out"},
		{ID: "ciAck", SourceNode: "ci", SourceHandle: "ack"},
	})

	tr := New(64)

	fromPrev := make(chan int, 1)
	toEdge := make(chan int, 1)
	toEdgeNew := make(chan int, 1)
	toNext := make(chan int, 1)
	toAck := make(chan int, 1)

	ci := CI.ChainInhibitorNode{
		Name:      "ci",
		HeldValue: 0,
		FromPrev:  fromPrev,
		ToEdge:    []chan<- int{toEdge},
		ToEdgeNew: []chan<- int{toEdgeNew},
		ToNext:    toNext,
		ToAck:     toAck,
	}

	ctx, cancel := context.WithCancel(context.Background())
	wg := new(sync.WaitGroup)
	wg.Add(1)
	s := S.SafeWorker{Ctx: ctx, Wg: wg, Trace: tr}
	go ci.Update(&s)

	fromPrev <- 5

	timeout := time.After(200 * time.Millisecond)
	for i := 0; i < 4; i++ {
		select {
		case v := <-toEdge:
			if v != 0 {
				t.Fatalf("toEdge got %d, want 0", v)
			}
		case v := <-toEdgeNew:
			if v != 5 {
				t.Fatalf("toEdgeNew got %d, want 5", v)
			}
		case v := <-toNext:
			if v != 0 {
				t.Fatalf("toNext got %d, want 0", v)
			}
		case v := <-toAck:
			if v != 1 {
				t.Fatalf("toAck got %d, want 1", v)
			}
		case <-timeout:
			t.Fatalf("only %d of 4 outputs received before timeout", i)
		}
	}
	cancel()
	wg.Wait()
	tr.Close()

	canonical := Resolve(tr.Events(), em)

	project := func(kind, node, port, edge string, value int) string {
		switch kind {
		case "recv":
			return "recv:" + node + "/" + port + "=" + itoaSignedCI(value)
		case "fire":
			return "fire:" + node
		case "send":
			return "send:" + edge + "=" + itoaSignedCI(value)
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
	if ps := per["ci"]; ps == nil || !(ps.recv < ps.fire && ps.fire < ps.send) {
		t.Errorf("ci: per-node order broken: %+v", ps)
	}
}

func itoaSignedCI(n int) string {
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
