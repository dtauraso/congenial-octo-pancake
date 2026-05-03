// Phase 7 Chunk 3 — recorder + emit-site tests.
//
// Two tests:
//   1. The recorder itself: monotonic Step, JSONL byte shape.
//   2. End-to-end through real nodes: wire Input → ChainInhibitor by
//      hand (no Wire() — this is a Trace-package test, not a Wiring
//      test), feed one value, assert recv/fire/send arrive in the
//      causal order the Go scheduler produced.

package Trace_test

import (
	"bytes"
	"context"
	"strings"
	"sync"
	"testing"
	"time"

	CI "github.com/dtauraso/wirefold/ChainInhibitorNode"
	INN "github.com/dtauraso/wirefold/InputNode"
	S "github.com/dtauraso/wirefold/SafeWorker"
	. "github.com/dtauraso/wirefold/Trace"
)

func TestRecorder_AssignsMonotonicStep(t *testing.T) {
	tr := New(8)
	tr.Recv("a", "in", 1)
	tr.Fire("a")
	tr.Send("a", "out", 1)
	tr.Close()

	got := tr.Events()
	if len(got) != 3 {
		t.Fatalf("got %d events, want 3", len(got))
	}
	for i, e := range got {
		if e.Step != i {
			t.Errorf("event %d: Step=%d, want %d", i, e.Step, i)
		}
	}
	if got[0].Kind != KindRecv || got[1].Kind != KindFire || got[2].Kind != KindSend {
		t.Errorf("kinds out of order: %v %v %v", got[0].Kind, got[1].Kind, got[2].Kind)
	}
}

func TestRecorder_NilTraceIsNoop(t *testing.T) {
	// Untraced runs (s.Trace == nil) must be safe — these methods are
	// called from hot loops in node Update.
	var tr *Trace
	tr.Recv("a", "in", 1)
	tr.Fire("a")
	tr.Send("a", "out", 1)
	tr.Close()
	if got := tr.Events(); got != nil {
		t.Errorf("nil trace returned %v, want nil", got)
	}
}

func TestRecorder_WriteJSONLShape(t *testing.T) {
	tr := New(8)
	tr.Recv("rl", "in", 5)
	tr.Fire("rl")
	tr.Send("rl", "out", 5)
	tr.Close()

	var buf bytes.Buffer
	if err := tr.WriteJSONL(&buf); err != nil {
		t.Fatalf("WriteJSONL: %v", err)
	}
	want := strings.Join([]string{
		`{"step":0,"kind":"recv","node":"rl","port":"in","value":5}`,
		`{"step":1,"kind":"fire","node":"rl"}`,
		`{"step":2,"kind":"send","node":"rl","port":"out","value":5}`,
		``,
	}, "\n")
	if got := buf.String(); got != want {
		t.Errorf("JSONL mismatch:\n got: %q\nwant: %q", got, want)
	}
}

// End-to-end: wire Input → ChainInhibitor and verify the trace
// captures the causal sequence. Since the recorder serializes
// through one channel, the order of events in the slice is *an*
// interleaving consistent with what each node observed locally — we
// assert the per-node-local order, not a global event order.
func TestEndToEnd_InputThroughChainInhibitor(t *testing.T) {
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

	// Wait until ci has emitted on ToNext (its ack is buffered, but
	// ToNext is the observable end of one full pipeline pass) or 200ms,
	// whichever comes first. 200ms is far longer than this fixture
	// needs and keeps the test from hanging if anything is wrong.
	deadline := time.After(200 * time.Millisecond)
	select {
	case <-ciOut:
	case <-deadline:
		t.Fatal("ci.ToNext never received the held value")
	}
	cancel()
	wg.Wait()
	tr.Close()

	events := tr.Events()
	// Every node must have produced at least: recv, fire, send.
	byNode := map[string][]Event{}
	for _, e := range events {
		byNode[e.Node] = append(byNode[e.Node], e)
	}
	for _, name := range []string{"in", "ci"} {
		seq := byNode[name]
		if len(seq) < 3 {
			t.Errorf("%s: got %d events, want ≥3 (recv/fire/send): %v", name, len(seq), seq)
			continue
		}
		// Per-node order: recv must precede fire which precedes send.
		// Multiple sends after one fire (CI fans out) are fine.
		var recvIdx, fireIdx, sendIdx = -1, -1, -1
		for i, e := range seq {
			switch e.Kind {
			case KindRecv:
				if recvIdx < 0 {
					recvIdx = i
				}
			case KindFire:
				if fireIdx < 0 {
					fireIdx = i
				}
			case KindSend:
				if sendIdx < 0 {
					sendIdx = i
				}
			}
		}
		if !(recvIdx < fireIdx && fireIdx < sendIdx) {
			t.Errorf("%s: per-node order broken (recv@%d, fire@%d, send@%d) in %v",
				name, recvIdx, fireIdx, sendIdx, seq)
		}
	}
	// in's recv must carry value 7; ci's send on out must carry 0
	// (the held value before update — initial held=0).
	for _, e := range byNode["in"] {
		if e.Kind == KindRecv && e.Value != 7 {
			t.Errorf("in.recv value=%d, want 7", e.Value)
		}
	}
	for _, e := range byNode["ci"] {
		if e.Kind == KindSend && e.Port == "out" && e.Value != 0 {
			t.Errorf("ci.send out value=%d, want 0 (initial held)", e.Value)
		}
	}
}
