// gen-node-defs walks nodes/*/ and emits src/webview/rf/nodes/node-defs.ts.
// Port names and directions are derived from Go channel-typed struct fields.
// View metadata and per-port accent overrides are read from SPEC.md.
// Run: go run ../../tools/gen-node-defs (from tools/topology-vscode/)
package main

import (
	"bufio"
	"bytes"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// port represents one channel-typed struct field.
type port struct {
	id        string // Go field name
	direction string // "in" or "out"
	accent    string // optional hex color from SPEC.md
}

// viewDef holds the SPEC.md ## View section fields.
type viewDef struct {
	kind         string
	bg           string
	border       string
	text         string
	accent       string
	minWidth     string
	sublabel     string
	displays     string
	defaultLabel string
}

// kindEntry is one node kind to emit.
type kindEntry struct {
	kind  string
	view  viewDef
	ports []port
}

func main() {
	// Generator is invoked from tools/topology-vscode/ via npm run gen:node-defs.
	// Resolve repo root relative to this file's location at compile time is not
	// possible; instead, walk up from cwd until we find a "nodes/" directory.
	cwd, err := os.Getwd()
	if err != nil {
		fatalf("getwd: %v", err)
	}
	repoRoot := findRepoRoot(cwd)
	if repoRoot == "" {
		fatalf("could not locate repo root (no nodes/ dir found from %s)", cwd)
	}

	nodesDir := filepath.Join(repoRoot, "nodes")
	entries, err := os.ReadDir(nodesDir)
	if err != nil {
		fatalf("readdir nodes: %v", err)
	}

	var kinds []kindEntry
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		pkgDir := filepath.Join(nodesDir, e.Name())
		if !hasRegister(pkgDir) {
			continue
		}
		ports, err := parsePortsFromAST(pkgDir)
		if err != nil {
			fatalf("parse ports %s: %v", e.Name(), err)
		}
		view, accentOverrides, err := parseSpecMD(pkgDir)
		if err != nil {
			// SPEC.md missing or no View section — skip this kind.
			continue
		}
		if view.kind == "" {
			continue
		}
		// Apply accent overrides from SPEC.md Ports table.
		for i, p := range ports {
			if a, ok := accentOverrides[p.id]; ok && a != "" {
				ports[i].accent = a
			}
		}
		kinds = append(kinds, kindEntry{kind: view.kind, view: view, ports: ports})
	}

	// Sort alphabetically by RF kind name (matching original generator behaviour).
	sort.Slice(kinds, func(i, j int) bool {
		return kinds[i].kind < kinds[j].kind
	})

	outPath := filepath.Join(repoRoot, "tools", "topology-vscode", "src", "webview", "rf", "nodes", "node-defs.ts")
	if err := writeNodeDefs(outPath, kinds); err != nil {
		fatalf("write %s: %v", outPath, err)
	}
	fmt.Fprintf(os.Stderr, "gen-node-defs: wrote %s (%d entries)\n", outPath, len(kinds))
}

// findRepoRoot walks up from dir until it finds a directory containing "nodes/".
func findRepoRoot(dir string) string {
	for {
		if _, err := os.Stat(filepath.Join(dir, "nodes")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return ""
		}
		dir = parent
	}
}

// hasRegister reports whether any .go file in dir contains "Wiring.Register(".
func hasRegister(dir string) bool {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return false
	}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".go") {
			continue
		}
		data, err := os.ReadFile(filepath.Join(dir, e.Name()))
		if err != nil {
			continue
		}
		if bytes.Contains(data, []byte("Wiring.Register(")) {
			return true
		}
	}
	return false
}

// parsePortsFromAST reads all .go files in pkgDir and returns ports derived
// from channel-typed struct fields. Fields with wire:"data.*" tags are skipped.
func parsePortsFromAST(pkgDir string) ([]port, error) {
	fset := token.NewFileSet()
	pkgs, err := parser.ParseDir(fset, pkgDir, nil, 0)
	if err != nil {
		return nil, err
	}
	var ports []port
	for _, pkg := range pkgs {
		for _, file := range pkg.Files {
			for _, decl := range file.Decls {
				genDecl, ok := decl.(*ast.GenDecl)
				if !ok || genDecl.Tok != token.TYPE {
					continue
				}
				for _, spec := range genDecl.Specs {
					typeSpec, ok := spec.(*ast.TypeSpec)
					if !ok {
						continue
					}
					structType, ok := typeSpec.Type.(*ast.StructType)
					if !ok {
						continue
					}
					for _, field := range structType.Fields.List {
						dir, ok := chanDirection(field.Type)
						if !ok {
							continue
						}
						// Skip wire:"data.*" fields.
						if field.Tag != nil {
							tag := strings.Trim(field.Tag.Value, "`")
							if strings.Contains(tag, `wire:"data.`) {
								continue
							}
						}
						// Get field name(s).
						for _, name := range field.Names {
							ports = append(ports, port{id: name.Name, direction: dir})
						}
					}
				}
			}
		}
	}
	return ports, nil
}

// chanDirection returns ("in", true) for <-chan T, ("out", true) for chan<- T,
// and ("", false) for bidirectional chan T or non-channel types.
func chanDirection(expr ast.Expr) (string, bool) {
	switch t := expr.(type) {
	case *ast.ChanType:
		switch t.Dir {
		case ast.RECV:
			return "in", true
		case ast.SEND:
			return "out", true
		}
		// ast.BOTH — bidirectional, not a wirable port.
		return "", false
	case *ast.ArrayType:
		// Fan-out: []chan<- T
		return chanDirection(t.Elt)
	}
	return "", false
}

// parseSpecMD reads SPEC.md in pkgDir and returns the view definition and
// a map of port-name → accent override from the Ports table.
func parseSpecMD(pkgDir string) (viewDef, map[string]string, error) {
	data, err := os.ReadFile(filepath.Join(pkgDir, "SPEC.md"))
	if err != nil {
		return viewDef{}, nil, err
	}
	lines := strings.Split(string(data), "\n")

	sectionLines := func(heading string) []string {
		start := -1
		for i, l := range lines {
			if strings.TrimSpace(l) == "## "+heading {
				start = i
				break
			}
		}
		if start == -1 {
			return nil
		}
		end := len(lines)
		for i := start + 1; i < len(lines); i++ {
			if strings.HasPrefix(lines[i], "## ") {
				end = i
				break
			}
		}
		return lines[start+1 : end]
	}

	// Parse a markdown table into rows.
	parseTable := func(tableLines []string) ([]string, [][]string) {
		var rows []string
		var headers []string
		var result [][]string
		for _, l := range tableLines {
			if !strings.Contains(l, "|") {
				continue
			}
			rows = append(rows, l)
		}
		if len(rows) < 2 {
			return nil, nil
		}
		// First row is headers.
		parts := strings.Split(rows[0], "|")
		for _, p := range parts {
			h := strings.TrimSpace(p)
			if h != "" {
				headers = append(headers, h)
			}
		}
		for _, row := range rows[1:] {
			parts := strings.Split(row, "|")
			var cells []string
			for _, p := range parts {
				cells = append(cells, strings.TrimSpace(p))
			}
			// Remove leading/trailing empty cells from split on "|".
			if len(cells) > 0 && cells[0] == "" {
				cells = cells[1:]
			}
			if len(cells) > 0 && cells[len(cells)-1] == "" {
				cells = cells[:len(cells)-1]
			}
			// Skip separator rows.
			allSep := true
			for _, c := range cells {
				if !isSep(c) {
					allSep = false
					break
				}
			}
			if allSep {
				continue
			}
			result = append(result, cells)
		}
		return headers, result
	}

	// Parse View section.
	viewLines := sectionLines("View")
	if viewLines == nil {
		return viewDef{}, nil, fmt.Errorf("no View section")
	}
	headers, rows := parseTable(viewLines)
	fieldIdx := indexOf(headers, "Field")
	valueIdx := indexOf(headers, "Value")
	if fieldIdx == -1 || valueIdx == -1 {
		return viewDef{}, nil, fmt.Errorf("View table missing Field/Value columns")
	}
	vmap := map[string]string{}
	for _, row := range rows {
		if fieldIdx < len(row) && valueIdx < len(row) {
			vmap[row[fieldIdx]] = row[valueIdx]
		}
	}
	view := viewDef{
		kind:         vmap["kind"],
		bg:           vmap["bg"],
		border:       vmap["border"],
		text:         vmap["text"],
		accent:       vmap["accent"],
		minWidth:     vmap["minWidth"],
		sublabel:     vmap["sublabel"],
		displays:     vmap["displays"],
		defaultLabel: vmap["defaultLabel"],
	}

	// Parse Ports section for accent overrides.
	accentOverrides := map[string]string{}
	portsLines := sectionLines("Ports")
	if portsLines != nil {
		headers, rows := parseTable(portsLines)
		nameIdx := indexOf(headers, "Name")
		accentIdx := indexOf(headers, "Accent")
		if nameIdx != -1 && accentIdx != -1 {
			for _, row := range rows {
				if nameIdx < len(row) && accentIdx < len(row) {
					name := row[nameIdx]
					accent := row[accentIdx]
					if name != "" && accent != "" {
						accentOverrides[name] = accent
					}
				}
			}
		}
	}

	return view, accentOverrides, nil
}

func isSep(s string) bool {
	for _, c := range s {
		if c != '-' && c != ':' && c != ' ' {
			return false
		}
	}
	return len(s) > 0
}

func indexOf[T comparable](slice []T, val T) int {
	for i, v := range slice {
		if v == val {
			return i
		}
	}
	return -1
}

// writeNodeDefs emits the node-defs.ts file.
func writeNodeDefs(outPath string, kinds []kindEntry) error {
	var buf bytes.Buffer
	w := bufio.NewWriter(&buf)

	fmt.Fprintln(w, `// GENERATED by tools/gen-node-defs — do not edit. Source: nodes/<Kind>/<Kind>.go + SPEC.md`)
	fmt.Fprintln(w)
	fmt.Fprintln(w, `export type DisplayKind = "queue" | "repeat" | "held";`)
	fmt.Fprintln(w)
	fmt.Fprintln(w, `export interface NodePort {`)
	fmt.Fprintln(w, `  id: string;`)
	fmt.Fprintln(w, `  accent?: string;`)
	fmt.Fprintln(w, `}`)
	fmt.Fprintln(w)
	fmt.Fprintln(w, `export interface NodeDef {`)
	fmt.Fprintln(w, `  defaultLabel: string;`)
	fmt.Fprintln(w, `  bg: string;`)
	fmt.Fprintln(w, `  border: string;`)
	fmt.Fprintln(w, `  text: string;`)
	fmt.Fprintln(w, `  accent: string;`)
	fmt.Fprintln(w, `  minWidth?: number;`)
	fmt.Fprintln(w, `  sublabel?: string;`)
	fmt.Fprintln(w, `  targets?: NodePort[];`)
	fmt.Fprintln(w, `  sources?: NodePort[];`)
	fmt.Fprintln(w, `  displays?: DisplayKind[];`)
	fmt.Fprintln(w, `}`)
	fmt.Fprintln(w)
	fmt.Fprintln(w, `export const NODE_DEFS: Record<string, NodeDef> = {`)
	for _, e := range kinds {
		fmt.Fprintf(w, "  %s: %s,\n", e.kind, buildDef(e.view, e.ports))
	}
	fmt.Fprint(w, `};`, "\n")

	w.Flush()
	return os.WriteFile(outPath, buf.Bytes(), 0644)
}

func buildDef(v viewDef, ports []port) string {
	targets := filterPorts(ports, "in")
	sources := filterPorts(ports, "out")

	var fields []string
	defaultLabel := v.defaultLabel
	if defaultLabel == "" {
		defaultLabel = v.kind
	}
	fields = append(fields, fmt.Sprintf(`defaultLabel: "%s"`, defaultLabel))
	fields = append(fields, fmt.Sprintf(`bg: "%s"`, v.bg))
	fields = append(fields, fmt.Sprintf(`border: "%s"`, v.border))
	fields = append(fields, fmt.Sprintf(`text: "%s"`, v.text))
	fields = append(fields, fmt.Sprintf(`accent: "%s"`, v.accent))
	if v.minWidth != "" {
		fields = append(fields, fmt.Sprintf(`minWidth: %s`, v.minWidth))
	}
	if v.sublabel != "" {
		fields = append(fields, fmt.Sprintf(`sublabel: "%s"`, v.sublabel))
	}
	if len(targets) > 0 {
		fields = append(fields, fmt.Sprintf(`targets: [%s]`, joinPorts(targets)))
	}
	if len(sources) > 0 {
		fields = append(fields, fmt.Sprintf(`sources: [%s]`, joinPorts(sources)))
	}
	if v.displays != "" {
		items := strings.Split(v.displays, ",")
		var quoted []string
		for _, item := range items {
			quoted = append(quoted, fmt.Sprintf(`"%s"`, strings.TrimSpace(item)))
		}
		fields = append(fields, fmt.Sprintf(`displays: [%s]`, strings.Join(quoted, ", ")))
	}
	return "{ " + strings.Join(fields, ", ") + " }"
}

func filterPorts(ports []port, dir string) []port {
	var out []port
	for _, p := range ports {
		if p.direction == dir {
			out = append(out, p)
		}
	}
	return out
}

func fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "gen-node-defs: "+format+"\n", args...)
	os.Exit(1)
}

func joinPorts(ports []port) string {
	var parts []string
	for _, p := range ports {
		if p.accent != "" {
			parts = append(parts, fmt.Sprintf(`{ id: "%s", accent: "%s" }`, p.id, p.accent))
		} else {
			parts = append(parts, fmt.Sprintf(`{ id: "%s" }`, p.id))
		}
	}
	return strings.Join(parts, ", ")
}
