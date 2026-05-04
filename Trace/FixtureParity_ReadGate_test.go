// Phase 8 Chunk 4 — ReadGate cross-language fixture parity.
//
// ReadGate is an AndGate variant whose output equals chainIn (TS:
// makeJoin(["chainIn","ack"], "out", a => a)). The Go ReadGateNode
// already existed with Trace wired; this test pins it against the
// TS-authored canonical fixture.

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

	RG "github.com/dtauraso/wirefold/ReadGateNode"
	S "github.com/dtauraso/wirefold/SafeWorker"
	. "github.com/dtauraso/wirefold/Trace"
)

func TestParity_FixtureMatch_ReadGate(t *testing.T) {
	fixturePath := filepath.Join("..", "tools", "topology-vscode", "test", "fixtures", "read-gate.trace.jsonl")
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
		{ID: "rgOut", SourceNode: "rg", SourceHandle: "out"},
	})

	tr := New(64)

	chainIn := make(chan int, 1)
	ackIn := make(chan int, 1)
	rgOut := make(chan int, 1)

	rg := RG.ReadGateNode{Name: "rg", FromValue: chainIn, FromAck: ackIn, ToLatch: rgOut}

	ctx, cancel := context.WithCancel(context.Background())
	wg := new(sync.WaitGroup)
	wg.Add(1)
	s := S.SafeWorker{Ctx: ctx, Wg: wg, Trace: tr}
	go rg.Update(&s)

	chainIn <- 7
	time.Sleep(2 * time.Millisecond)
	ackIn <- 1

	select {
	case v := <-rgOut:
		if v != 7 {
			t.Fatalf("rgOut got %d, want 7", v)
		}
	case <-time.After(200 * time.Millisecond):
		t.Fatal("rgOut never arrived")
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
	if ps := per["rg"]; ps == nil || !(ps.recv < ps.fire && ps.fire < ps.send) {
		t.Errorf("rg: per-node order broken: %+v", ps)
	}
}
