// Phase 7 follow-up — cross-language fixture parity.
//
// Wires the same Input → ReadLatch → ChainInhibitor topology the TS
// chunk-1 fixture describes, runs it through the Go runtime + Trace
// + resolver, and asserts the canonical projection matches the bytes
// of tools/topology-vscode/test/fixtures/chain-cascade.trace.jsonl.
//
// Comparison rules:
//   - Multiset equality on projection keys (kind, node|edge, port?, value?).
//   - Per-node ordering: recv before fire before send.
//   - Total ordering is NOT asserted: the Go scheduler picks a real
//     concurrent interleaving while TS is deterministic FIFO. Both
//     are correct executions of the same spec.
//
// Why this is the strongest "TS and Go agree" signal we have: the TS
// fixture was authored by the TS simulator (historyToTrace over
// world.history); the Go side is independent code emitting events
// from real channel sends. If the multisets match, the two
// implementations agree on what the spec means.

package Trace_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	CI "github.com/dtauraso/wirefold/nodes/ChainInhibitorNode"
	RL "github.com/dtauraso/wirefold/nodes/ReadLatchNode"
	S "github.com/dtauraso/wirefold/nodes/SafeWorker"
	. "github.com/dtauraso/wirefold/Trace"

	"context"
	"sync"
	"time"
)

// canonicalLine is just enough of the wire format to project. We don't
// reuse Event because the canonical form uses `edge` (not node+port)
// for sends, and the Trace package's Event struct stores both fields.
type canonicalLine struct {
	Step  int    `json:"step"`
	Kind  string `json:"kind"`
	Node  string `json:"node,omitempty"`
	Port  string `json:"port,omitempty"`
	Edge  string `json:"edge,omitempty"`
	Value int    `json:"value,omitempty"`
}

func parseFixture(t *testing.T, path string) []canonicalLine {
	t.Helper()
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read fixture %s: %v", path, err)
	}
	var out []canonicalLine
	for i, line := range strings.Split(strings.TrimRight(string(raw), "\n"), "\n") {
		if line == "" {
			continue
		}
		var c canonicalLine
		if err := json.Unmarshal([]byte(line), &c); err != nil {
			t.Fatalf("fixture line %d: %v", i+1, err)
		}
		out = append(out, c)
	}
	return out
}

func projectCanonical(c canonicalLine) string {
	switch c.Kind {
	case "recv":
		return "recv:" + c.Node + "/" + c.Port + "=" + itoa(c.Value)
	case "fire":
		return "fire:" + c.Node
	case "send":
		return "send:" + c.Edge + "=" + itoa(c.Value)
	}
	return ""
}

func itoa(n int) string {
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

func TestParity_FixtureMatch_ChainCascade(t *testing.T) {
	fixturePath := filepath.Join("..", "tools", "topology-vscode", "test", "fixtures", "chain-cascade.trace.jsonl")
	want := parseFixture(t, fixturePath)

	// EdgeMap mirrors the TS fixtureA edge list. Only edges whose
	// source node actually emits matter; the resolver drops sends on
	// unmapped ports. rl.ack and ci.{out,ack} are deliberately not
	// here — they're dead-end on the TS side too (ci has no outgoing
	// edges; rl.ack only feeds the releaseInjector self-loop, which
	// the runtime doesn't model as a Go channel here).
	em := BuildEdgeMap([]EdgeLite{
		{ID: "rlToCi", SourceNode: "rl", SourceHandle: "out"},
	})

	tr := New(64)

	inToRl := make(chan int, 1)
	relCh := make(chan int, 1)
	rlToCi := make(chan int, 1)
	rlAck := make(chan int, 1)
	ciOut := make(chan int, 1)
	ciAck := make(chan int, 1)

	rl := RL.ReadLatchNode{Name: "rl", FromIn: inToRl, FromRelease: relCh, ToNext: rlToCi, ToAck: rlAck}
	ci := CI.ChainInhibitorNode{Id: 0, Name: "ci", FromPrev: rlToCi, ToAck: ciAck, ToNext: ciOut}

	ctx, cancel := context.WithCancel(context.Background())
	wg := new(sync.WaitGroup)
	wg.Add(2)
	s := S.SafeWorker{Ctx: ctx, Wg: wg, Trace: tr}
	go rl.Update(&s)
	go ci.Update(&s)

	// Stand in for TS seeds: in.out=5 at tick 0, rl.release=1 at tick 1.
	// The brief sleep guarantees rl consumes `in` before `release` —
	// without it, Go's select can pick release first and drop it.
	inToRl <- 5
	time.Sleep(2 * time.Millisecond)
	relCh <- 1

	select {
	case <-ciOut:
	case <-time.After(200 * time.Millisecond):
		t.Fatal("ci.out never received the held value")
	}
	cancel()
	wg.Wait()
	tr.Close()

	canonical := Resolve(tr.Events(), em)

	wantKeys := map[string]int{}
	for _, c := range want {
		wantKeys[projectCanonical(c)]++
	}
	gotKeys := map[string]int{}
	for _, e := range canonical {
		gotKeys[projection(e)]++
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
		t.Logf("got canonical sequence: %+v", canonical)
		t.Logf("want fixture sequence: %+v", want)
	}

	// Per-node ordering: recv < fire < send. Strictly first-occurrence;
	// the test wires one-shot inputs so each node has at most one of
	// each kind.
	type seen struct{ recv, fire, send int }
	per := map[string]*seen{}
	for i, e := range canonical {
		s := per[e.Node]
		if s == nil {
			s = &seen{recv: -1, fire: -1, send: -1}
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
	if s := per["rl"]; s == nil || !(s.recv < s.fire && s.fire < s.send) {
		t.Errorf("rl: per-node order broken: %+v", s)
	}
	if s := per["ci"]; s == nil || !(s.recv < s.fire) {
		t.Errorf("ci: per-node order broken: %+v", s)
	}
}
