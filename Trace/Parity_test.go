// Phase 7 Chunk 4 — Go-side parity test.
//
// Hand-wires a small Input → ChainInhibitor topology (Go-supported
// node types only — the chunk-1 fixture's ReadLatch isn't in the Go
// node set), runs it with tracing, runs the resolver against a
// hand-built EdgeMap, and asserts the canonical event sequence's
// projection matches a hand-coded expected sequence.
//
// "Projection" here means the same one detectDrift uses on the TS
// side: (kind, node|edge, port?, value?) — step is excluded so the
// test isn't sensitive to dead-end emissions that get filtered out.
//
// Cross-language parity (TS-vs-Go traces for the same spec) stays
// as a possible Chunk 5 follow-up. This chunk pins Go-side behavior
// against a known-good projection.

package Trace_test

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	CI "github.com/dtauraso/wirefold/ChainInhibitorNode"
	INN "github.com/dtauraso/wirefold/InputNode"
	S "github.com/dtauraso/wirefold/SafeWorker"
	. "github.com/dtauraso/wirefold/Trace"
)

// projection collapses an event to the comparison key. Mirrors the
// drift projection in src/sim/drift.ts.
func projection(e Event) string {
	switch e.Kind {
	case KindRecv:
		return fmt.Sprintf("recv:%s/%s=%d", e.Node, e.Port, e.Value)
	case KindFire:
		return fmt.Sprintf("fire:%s", e.Node)
	case KindSend:
		return fmt.Sprintf("send:%s=%d", e.Edge, e.Value)
	}
	return ""
}

func TestParity_InputThroughChainInhibitor(t *testing.T) {
	// Spec: in --[inToCi]--> ci, with ci's ack and inhibitOut going to
	// dead-end channels. The resolver should drop sends on those
	// dead-end ports because they have no spec edge.
	edges := []EdgeLite{
		{ID: "inToCi", SourceNode: "in", SourceHandle: "out"},
	}
	em := BuildEdgeMap(edges)

	tr := New(64)
	defer tr.Close()

	inputCh := make(chan int, 1)
	inToCi := make(chan int, 1)
	ciAck := make(chan int, 1)
	ciOut := make(chan int, 1)

	in := INN.InputNode{Id: 0, Name: "in", Input: inputCh, ToNext: inToCi}
	ci := CI.ChainInhibitorNode{Id: 0, Name: "ci", FromPrev: inToCi, ToAck: ciAck, ToNext: ciOut}

	inputCh <- 7

	ctx, cancel := context.WithCancel(context.Background())
	wg := new(sync.WaitGroup)
	wg.Add(2)
	s := S.SafeWorker{Ctx: ctx, Wg: wg, Trace: tr}
	go in.Update(&s)
	go ci.Update(&s)

	// Wait until ci has emitted on out (the only mapped edge), then
	// shut down. 200ms is generous; the topology completes in
	// microseconds.
	select {
	case <-ciOut:
	case <-time.After(200 * time.Millisecond):
		t.Fatal("ci.out never received the held value")
	}
	cancel()
	wg.Wait()
	tr.Close()

	canonical := Resolve(tr.Events(), em)
	got := make([]string, len(canonical))
	for i, e := range canonical {
		got[i] = projection(e)
	}

	// Expected projection. Per-side ordering:
	//   in: recv(Input,7)  fire  send(out,7)
	//   ci: recv(in,7)     fire  send(out,0 — initial held)
	// ci's sends on `ack` and `out`'s dead-end neighbors are dropped
	// by Resolve (only `inToCi` is in the EdgeMap, but that edge's
	// source is `in`, so ci has zero mapped sends... wait — ci has
	// no edges with source=ci, so ALL of ci's sends drop).
	//
	// So the canonical sequence is:
	//   recv:in/Input=7
	//   fire:in
	//   send:inToCi=7
	//   recv:ci/in=7
	//   fire:ci
	// The Go scheduler's interleaving determines whether "fire:in"
	// happens before "recv:ci/in" — they could in principle land in
	// either order around the ToNext send. Assert as a *set* of
	// expected projections plus a per-node ordering check, not a
	// strict global sequence.
	want := map[string]int{
		"recv:in/Input=7": 1,
		"fire:in":         1,
		"send:inToCi=7":   1,
		"recv:ci/in=7":    1,
		"fire:ci":         1,
	}
	gotCount := map[string]int{}
	for _, p := range got {
		gotCount[p]++
	}
	for k, n := range want {
		if gotCount[k] != n {
			t.Errorf("projection %q: got %d, want %d (full sequence: %v)",
				k, gotCount[k], n, got)
		}
	}
	for k, n := range gotCount {
		if want[k] == 0 {
			t.Errorf("unexpected projection %q (count %d) in: %v", k, n, got)
		}
	}

	// Per-node ordering: recv before fire before send.
	type seenT struct{ recv, fire, send int }
	per := map[string]*seenT{}
	for i, e := range canonical {
		s := per[e.Node]
		if s == nil {
			s = &seenT{recv: -1, fire: -1, send: -1}
			per[e.Node] = s
		}
		switch e.Kind {
		case KindRecv:
			if s.recv < 0 {
				s.recv = i
			}
		case KindFire:
			if s.fire < 0 {
				s.fire = i
			}
		case KindSend:
			if s.send < 0 {
				s.send = i
			}
		}
	}
	if s := per["in"]; s == nil || !(s.recv < s.fire && s.fire < s.send) {
		t.Errorf("in: per-node order broken: %+v", s)
	}
	if s := per["ci"]; s == nil || !(s.recv < s.fire) {
		t.Errorf("ci: per-node order broken: %+v", s)
	}
}

func TestResolve_DropsSendsForDeadEndPorts(t *testing.T) {
	// Pure resolver test — no goroutines, no channels. Construct raw
	// events directly and verify Resolve drops sends without an edge
	// and rewrites the rest.
	em := BuildEdgeMap([]EdgeLite{
		{ID: "e1", SourceNode: "a", SourceHandle: "out"},
	})
	raw := []Event{
		{Kind: KindRecv, Node: "a", Port: "in", Value: 1},
		{Kind: KindFire, Node: "a"},
		{Kind: KindSend, Node: "a", Port: "out", Value: 1},  // mapped → e1
		{Kind: KindSend, Node: "a", Port: "ack", Value: 1},  // dead end → dropped
	}
	got := Resolve(raw, em)
	if len(got) != 3 {
		t.Fatalf("got %d events, want 3 (one dead-end send dropped): %+v", len(got), got)
	}
	if got[2].Kind != KindSend || got[2].Edge != "e1" || got[2].Value != 1 {
		t.Errorf("send not resolved correctly: %+v", got[2])
	}
	for i, e := range got {
		if e.Step != i {
			t.Errorf("got[%d].Step=%d, want %d", i, e.Step, i)
		}
	}
}

func TestWriteCanonicalJSONL_Shape(t *testing.T) {
	em := BuildEdgeMap([]EdgeLite{
		{ID: "rlToCi", SourceNode: "rl", SourceHandle: "out"},
	})
	raw := []Event{
		{Kind: KindRecv, Node: "rl", Port: "in", Value: 5},
		{Kind: KindFire, Node: "rl"},
		{Kind: KindSend, Node: "rl", Port: "out", Value: 5},
	}
	canonical := Resolve(raw, em)
	var buf bytesBuffer
	if err := WriteCanonicalJSONL(canonical, &buf); err != nil {
		t.Fatalf("WriteCanonicalJSONL: %v", err)
	}
	want := `{"step":0,"kind":"recv","node":"rl","port":"in","value":5}
{"step":1,"kind":"fire","node":"rl"}
{"step":2,"kind":"send","edge":"rlToCi","value":5}
`
	if got := buf.String(); got != want {
		t.Errorf("canonical JSONL mismatch:\n got: %q\nwant: %q", got, want)
	}
}

// Tiny in-memory buffer used by WriteCanonicalJSONL_Shape to avoid
// importing bytes purely for the test fixture. Avoids a dependency
// on test/* helpers and keeps this file self-contained.
type bytesBuffer struct{ b []byte }

func (w *bytesBuffer) Write(p []byte) (int, error) {
	w.b = append(w.b, p...)
	return len(p), nil
}
func (w *bytesBuffer) String() string { return string(w.b) }
