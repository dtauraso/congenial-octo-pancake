// loader_test.go — parity test: LoadTopology vs Wire().
//
// Loads the canonical topology.json and asserts:
//   - same node count as Wire()
//   - same per-kind counts
//   - Input nodes have their seed values pre-loaded (channel length matches)

package Wiring

import (
	"fmt"
	"path/filepath"
	"runtime"
	"testing"

	IPN "github.com/dtauraso/wirefold/nodes/InputNode"
	S "github.com/dtauraso/wirefold/nodes/SafeWorker"
)

// repoRoot returns the repository root regardless of where the test binary runs.
func repoRoot() string {
	_, file, _, _ := runtime.Caller(0)
	// file = .../nodes/Wiring/loader_test.go  — go up two levels
	return filepath.Join(filepath.Dir(file), "..", "..")
}

func TestLoadTopology_ParityWithWire(t *testing.T) {
	jsonPath := filepath.Join(repoRoot(), "topology.json")

	loaded, err := LoadTopology(jsonPath)
	if err != nil {
		t.Fatalf("LoadTopology: %v", err)
	}

	wired := Wire()

	if len(loaded) != len(wired) {
		t.Fatalf("node count: loaded=%d wired=%d", len(loaded), len(wired))
	}

	// Count per-kind by Go type name.
	kindCount := func(nodes []S.Node) map[string]int {
		m := map[string]int{}
		for _, n := range nodes {
			switch n.(type) {
			case *IPN.InputNode:
				m["Input"]++
			default:
				m[typeName(n)]++
			}
		}
		return m
	}

	lc := kindCount(loaded)
	wc := kindCount(wired)
	for k, wn := range wc {
		if lc[k] != wn {
			t.Errorf("kind %q: loaded=%d wired=%d", k, lc[k], wn)
		}
	}
	for k, ln := range lc {
		if wc[k] != ln {
			t.Errorf("kind %q: loaded=%d wired=%d (extra in loaded)", k, ln, wc[k])
		}
	}

	// Assert Input nodes have their seed values pre-loaded.
	type seedCase struct {
		name string
		want int // expected channel length (number of pre-loaded values)
	}
	cases := []seedCase{
		{name: "in08", want: 2},
		{name: "bootstrap_rg", want: 1},
	}
	for _, n := range loaded {
		inp, ok := n.(*IPN.InputNode)
		if !ok {
			continue
		}
		for _, c := range cases {
			if inp.Name == c.name {
				got := len(inp.Input)
				if got != c.want {
					t.Errorf("Input %q: channel len=%d, want %d", c.name, got, c.want)
				}
			}
		}
	}
}

// typeName returns a short type label for unknown node types.
func typeName(n S.Node) string {
	return fmt.Sprintf("%T", n)
}
