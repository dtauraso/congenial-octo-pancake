// Phase 8 Chunk 2 — StreakDetector cross-language fixture parity.
//
// Same shape as FixtureParity_AndGate_test.go: runs sd through the Go
// runtime + Trace + resolver, asserts the canonical projection
// matches tools/topology-vscode/test/fixtures/streak-detector.trace.jsonl.
// Scenario: old=1, new=1 → done=1, streak=1 (matching signs).

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

	SD "github.com/dtauraso/wirefold/nodes/StreakDetector"
	S "github.com/dtauraso/wirefold/nodes/SafeWorker"
	. "github.com/dtauraso/wirefold/Trace"
)

func TestParity_FixtureMatch_StreakDetector(t *testing.T) {
	fixturePath := filepath.Join("..", "tools", "topology-vscode", "test", "fixtures", "streak-detector.trace.jsonl")
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
		{ID: "sdDone", SourceNode: "sd", SourceHandle: "done"},
		{ID: "sdStreak", SourceNode: "sd", SourceHandle: "streak"},
	})

	tr := New(64)

	oldIn := make(chan int, 1)
	newIn := make(chan int, 1)
	doneOut := make(chan int, 1)
	streakOut := make(chan int, 1)

	sd := SD.StreakDetector{Name: "sd", FromOld: oldIn, FromNew: newIn, ToDone: doneOut, ToStreak: streakOut}

	ctx, cancel := context.WithCancel(context.Background())
	wg := new(sync.WaitGroup)
	wg.Add(1)
	s := S.SafeWorker{Ctx: ctx, Wg: wg, Trace: tr}
	go sd.Update(&s)

	oldIn <- 1
	time.Sleep(2 * time.Millisecond)
	newIn <- 1

	// Drain both outputs so the loop can clear and exit cleanly.
	for i := 0; i < 2; i++ {
		select {
		case <-doneOut:
		case <-streakOut:
		case <-time.After(200 * time.Millisecond):
			t.Fatalf("output %d never arrived", i)
		}
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

	// Per-node ordering for sd: recv before fire before send (any send).
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
	if ps := per["sd"]; ps == nil || !(ps.recv < ps.fire && ps.fire < ps.send) {
		t.Errorf("sd: per-node order broken: %+v", ps)
	}
}
