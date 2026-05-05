// Phase 8 Chunk 8 — EdgeNode cross-language fixture parity.
//
// Same shape as FixtureParity_AndGate_test.go: runs an EdgeNode XOR
// through the Go runtime + Trace + resolver, asserts the canonical
// projection matches the bytes of
// tools/topology-vscode/test/fixtures/edge-node.trace.jsonl.
//
// Comparison rules: multiset equality on projection keys, plus per-
// node ordering (recv before fire before send).

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

	EN "github.com/dtauraso/wirefold/nodes/EdgeNode"
	S "github.com/dtauraso/wirefold/nodes/SafeWorker"
	. "github.com/dtauraso/wirefold/Trace"
)

func TestParity_FixtureMatch_EdgeNode(t *testing.T) {
	fixturePath := filepath.Join("..", "tools", "topology-vscode", "test", "fixtures", "edge-node.trace.jsonl")
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
		{ID: "ednInhibitor", SourceNode: "edn", SourceHandle: "outInhibitor"},
		{ID: "ednPartition", SourceNode: "edn", SourceHandle: "outPartition"},
		{ID: "ednNextEdge", SourceNode: "edn", SourceHandle: "outNextEdge"},
	})

	tr := New(64)

	leftIn := make(chan int, 1)
	rightIn := make(chan int, 1)
	toInhibitor := make(chan int, 1)
	toPartition := make(chan int, 1)
	toNextEdge := make(chan int, 1)

	edn := EN.EdgeNode{
		Name:        "edn",
		FromLeft:    leftIn,
		FromRight:   rightIn,
		ToInhibitor: toInhibitor,
		ToPartition: toPartition,
		ToNextEdge:  toNextEdge,
	}

	ctx, cancel := context.WithCancel(context.Background())
	wg := new(sync.WaitGroup)
	wg.Add(1)
	s := S.SafeWorker{Ctx: ctx, Wg: wg, Trace: tr}
	go edn.Update(&s)

	// Stand in for TS seeds: left=1 then right=0. Brief sleep so edn
	// observes left before right (per-node ordering check below).
	leftIn <- 1
	time.Sleep(2 * time.Millisecond)
	rightIn <- 0

	// Drain all three outputs.
	timeout := time.After(200 * time.Millisecond)
	for i := 0; i < 3; i++ {
		select {
		case v := <-toInhibitor:
			if v != 1 {
				t.Fatalf("toInhibitor got %d, want 1", v)
			}
		case v := <-toPartition:
			if v != 1 {
				t.Fatalf("toPartition got %d, want 1", v)
			}
		case v := <-toNextEdge:
			if v != 1 {
				t.Fatalf("toNextEdge got %d, want 1", v)
			}
		case <-timeout:
			t.Fatalf("only %d of 3 outputs received before timeout", i)
		}
	}
	cancel()
	wg.Wait()
	tr.Close()

	canonical := Resolve(tr.Events(), em)

	project := func(kind, node, port, edge string, value int) string {
		switch kind {
		case "recv":
			return "recv:" + node + "/" + port + "=" + itoaSignedEdge(value)
		case "fire":
			return "fire:" + node
		case "send":
			return "send:" + edge + "=" + itoaSignedEdge(value)
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
	if ps := per["edn"]; ps == nil || !(ps.recv < ps.fire && ps.fire < ps.send) {
		t.Errorf("edn: per-node order broken: %+v", ps)
	}
}

func itoaSignedEdge(n int) string {
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
