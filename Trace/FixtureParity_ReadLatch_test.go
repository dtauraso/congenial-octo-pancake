// Phase 8 Chunk 11 — ReadLatch cross-language fixture parity.
//
// Two-branch latch: `release` arriving with no held value records recv
// only (no fire/sends); `release` arriving with a held value emits
// out=held + ack=1. Fixture exercises both branches in one run:
// release-empty → in → release-full.

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

	RL "github.com/dtauraso/wirefold/ReadLatchNode"
	S "github.com/dtauraso/wirefold/SafeWorker"
	. "github.com/dtauraso/wirefold/Trace"
)

func TestParity_FixtureMatch_ReadLatch(t *testing.T) {
	fixturePath := filepath.Join("..", "tools", "topology-vscode", "test", "fixtures", "read-latch.trace.jsonl")
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
		{ID: "rlOut", SourceNode: "rl", SourceHandle: "out"},
		{ID: "rlAck", SourceNode: "rl", SourceHandle: "ack"},
	})

	tr := New(64)

	fromIn := make(chan int, 1)
	fromRelease := make(chan int, 2)
	toNext := make(chan int, 1)
	toAck := make(chan int, 1)

	rl := RL.ReadLatchNode{
		Name:        "rl",
		FromIn:      fromIn,
		FromRelease: fromRelease,
		ToNext:      toNext,
		ToAck:       toAck,
	}

	ctx, cancel := context.WithCancel(context.Background())
	wg := new(sync.WaitGroup)
	wg.Add(1)
	s := S.SafeWorker{Ctx: ctx, Wg: wg, Trace: tr}
	go rl.Update(&s)

	// Branch 1: empty release — recv only, no fire/send.
	fromRelease <- 1
	// Give the goroutine a moment to consume the empty release before
	// we deposit the held value, so trace order matches the fixture.
	time.Sleep(20 * time.Millisecond)

	// Branch 2: in then release — full fire.
	fromIn <- 7
	time.Sleep(20 * time.Millisecond)
	fromRelease <- 1

	timeout := time.After(200 * time.Millisecond)
	gotOut, gotAck := false, false
	for !(gotOut && gotAck) {
		select {
		case v := <-toNext:
			if v != 7 {
				t.Fatalf("toNext got %d, want 7", v)
			}
			gotOut = true
		case v := <-toAck:
			if v != 1 {
				t.Fatalf("toAck got %d, want 1", v)
			}
			gotAck = true
		case <-timeout:
			t.Fatalf("only out=%v ack=%v received before timeout", gotOut, gotAck)
		}
	}
	cancel()
	wg.Wait()
	tr.Close()

	canonical := Resolve(tr.Events(), em)

	project := func(kind, node, port, edge string, value int) string {
		switch kind {
		case "recv":
			return "recv:" + node + "/" + port + "=" + itoaSignedRL(value)
		case "fire":
			return "fire:" + node
		case "send":
			return "send:" + edge + "=" + itoaSignedRL(value)
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
	if ps := per["rl"]; ps == nil || !(ps.recv < ps.fire && ps.fire < ps.send) {
		t.Errorf("rl: per-node order broken: %+v", ps)
	}
}

func itoaSignedRL(n int) string {
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
