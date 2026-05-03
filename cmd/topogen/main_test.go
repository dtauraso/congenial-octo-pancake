package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"go/format"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// Tier 1 contract test: fixed spec.json inputs produce byte-identical
// Wiring.go outputs. Each case under testdata/ is a directory containing
// spec.json plus expected/Wiring.go. Run `go test ./cmd/topogen -update`
// to rewrite expected/Wiring.go after an intentional codegen change.
//
// A second pass (TestGoldenBuilds) drops the generated source into a
// throwaway module that `replace`s the parent module and runs `go build`,
// so generated output is guaranteed to compile against the real node
// packages — not just match bytes.

var update = flag.Bool("update", false, "rewrite testdata/*/expected/Wiring.go from current codegen output")

func goldenCases(t *testing.T) []string {
	t.Helper()
	entries, err := os.ReadDir("testdata")
	if err != nil {
		t.Fatalf("read testdata: %v", err)
	}
	var names []string
	for _, e := range entries {
		if e.IsDir() {
			names = append(names, e.Name())
		}
	}
	if len(names) == 0 {
		t.Fatal("no testdata cases found")
	}
	return names
}

func generateForCase(t *testing.T, dir string) []byte {
	t.Helper()
	specPath := filepath.Join("testdata", dir, "spec.json")
	data, err := os.ReadFile(specPath)
	if err != nil {
		t.Fatalf("read %s: %v", specPath, err)
	}
	var spec Spec
	if err := json.Unmarshal(data, &spec); err != nil {
		t.Fatalf("unmarshal %s: %v", specPath, err)
	}
	src, err := generate(spec)
	if err != nil {
		t.Fatalf("generate %s: %v", dir, err)
	}
	formatted, err := format.Source([]byte(src))
	if err != nil {
		t.Fatalf("format %s: %v\nraw:\n%s", dir, err, src)
	}
	return formatted
}

func TestGolden(t *testing.T) {
	for _, name := range goldenCases(t) {
		t.Run(name, func(t *testing.T) {
			got := generateForCase(t, name)
			expectedPath := filepath.Join("testdata", name, "expected", "Wiring.go")
			if *update {
				if err := os.MkdirAll(filepath.Dir(expectedPath), 0755); err != nil {
					t.Fatal(err)
				}
				if err := os.WriteFile(expectedPath, got, 0644); err != nil {
					t.Fatal(err)
				}
				return
			}
			want, err := os.ReadFile(expectedPath)
			if err != nil {
				t.Fatalf("missing %s — run `go test ./cmd/topogen -update`", expectedPath)
			}
			if !bytes.Equal(got, want) {
				t.Errorf("generated output does not match %s\n--- got ---\n%s\n--- want ---\n%s",
					expectedPath, got, want)
			}
		})
	}
}

// TestGoldenBuilds writes each case's generated Wiring.go into a temp
// module that `replace`s github.com/dtauraso/wirefold to
// the live repo, then runs `go build ./...`. Catches API drift in node
// packages that bytes-only golden checks miss (renamed fields, removed
// types, etc.) — bytes match is necessary but not sufficient.
func TestGoldenBuilds(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping go build in -short mode")
	}
	wd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	repoRoot, err := filepath.Abs(filepath.Join(wd, "..", ".."))
	if err != nil {
		t.Fatal(err)
	}

	for _, name := range goldenCases(t) {
		t.Run(name, func(t *testing.T) {
			src := generateForCase(t, name)
			tmp := t.TempDir()
			gomod := fmt.Sprintf(
				"module wiringtest\n\ngo 1.21\n\nrequire github.com/dtauraso/wirefold v0.0.0\n\nreplace github.com/dtauraso/wirefold => %s\n",
				repoRoot,
			)
			if err := os.WriteFile(filepath.Join(tmp, "go.mod"), []byte(gomod), 0644); err != nil {
				t.Fatal(err)
			}
			pkgDir := filepath.Join(tmp, "Wiring")
			if err := os.MkdirAll(pkgDir, 0755); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(filepath.Join(pkgDir, "Wiring.go"), src, 0644); err != nil {
				t.Fatal(err)
			}
			cmd := exec.Command("go", "build", "./...")
			cmd.Dir = tmp
			cmd.Env = append(os.Environ(), "GOFLAGS=-mod=mod")
			out, err := cmd.CombinedOutput()
			if err != nil {
				t.Fatalf("go build failed for case %s: %v\n%s", name, err, strings.TrimSpace(string(out)))
			}
		})
	}
}
