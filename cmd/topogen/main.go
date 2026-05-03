// topogen reads a topology.json spec and emits Wiring/wiring.go,
// a Wire() function that allocates channels and constructs each node.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"go/format"
	"os"
	"regexp"
	"sort"
	"strings"
)

// identRE matches a safe Go identifier. Every spec-supplied string that gets
// emitted into generated source as an identifier must be checked against this
// before use — otherwise an attacker controlling topology.json could inject
// arbitrary Go statements into Wiring/wiring.go.
var identRE = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)

func checkIdent(field, value string) error {
	if !identRE.MatchString(value) {
		return fmt.Errorf("invalid identifier in %s: %q", field, value)
	}
	return nil
}

type NodeData struct {
	Init []int `json:"init,omitempty"`
}

type Node struct {
	ID    string    `json:"id"`
	Type  string    `json:"type"`
	Index *int      `json:"index,omitempty"`
	Data  *NodeData `json:"data,omitempty"`
}

type EdgeData struct {
	Init []int `json:"init,omitempty"`
}

type Edge struct {
	Label        string    `json:"label"`
	Source       string    `json:"source"`
	SourceHandle string    `json:"sourceHandle"`
	Target       string    `json:"target"`
	TargetHandle string    `json:"targetHandle"`
	Kind         string    `json:"kind"`
	Data         *EdgeData `json:"data,omitempty"`
}

func (e Edge) InitVals() []int {
	if e.Data == nil {
		return nil
	}
	return e.Data.Init
}

type Spec struct {
	Nodes []Node `json:"nodes"`
	Edges []Edge `json:"edges"`
}

type PortBind struct {
	Field string
	Multi bool // emit slice literal
}

type NodeBind struct {
	Pkg     string
	Alias   string
	Struct  string
	Inputs  map[string]PortBind
	Outputs map[string]PortBind
	HasInputChan bool // node has an external Input channel pre-loaded with init values
	InputField   string
}

var REGISTRY = map[string]NodeBind{
	"Input": {
		Pkg: "github.com/dtauraso/congenial-octo-pancake/InputNode", Alias: "INN", Struct: "InputNode",
		Outputs:      map[string]PortBind{"out": {Field: "ToNext"}},
		HasInputChan: true, InputField: "Input",
	},
	"ReadGate": {
		Pkg: "github.com/dtauraso/congenial-octo-pancake/ReadGateNode", Alias: "RGN", Struct: "ReadGateNode",
		Inputs: map[string]PortBind{
			"chainIn": {Field: "FromValue"},
			"ack":     {Field: "FromAck"},
		},
		Outputs: map[string]PortBind{"out": {Field: "ToLatch"}},
	},
	"ChainInhibitor": {
		Pkg: "github.com/dtauraso/congenial-octo-pancake/ChainInhibitorNode", Alias: "CI", Struct: "ChainInhibitorNode",
		Inputs: map[string]PortBind{"in": {Field: "FromPrev"}},
		Outputs: map[string]PortBind{
			"out":        {Field: "ToNext"},
			"ack":        {Field: "ToAck"},
			"inhibitOut": {Field: "ToEdge", Multi: true},
		},
	},
	"InhibitRightGate": {
		Pkg: "github.com/dtauraso/congenial-octo-pancake/InhibitRightGateNode", Alias: "IRG", Struct: "InhibitRightGateNode",
		Inputs:  map[string]PortBind{"left": {Field: "FromLeft"}, "right": {Field: "FromRight"}},
		Outputs: map[string]PortBind{"out": {Field: "ToOut"}},
	},
}

func main() {
	in := flag.String("in", "topology.json", "spec file")
	out := flag.String("out", "Wiring/wiring.go", "output file")
	flag.Parse()

	data, err := os.ReadFile(*in)
	must(err)
	var spec Spec
	must(json.Unmarshal(data, &spec))

	src, err := generate(spec)
	must(err)

	formatted, ferr := format.Source([]byte(src))
	if ferr != nil {
		fmt.Fprintf(os.Stderr, "format error: %v\nraw source:\n%s", ferr, src)
		os.Exit(1)
	}
	must(os.WriteFile(*out, formatted, 0644))
	fmt.Printf("wrote %s (%d bytes)\n", *out, len(formatted))
}

func must(err error) {
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func generate(spec Spec) (string, error) {
	// Validate every node has a registry entry; build edge maps.
	for _, n := range spec.Nodes {
		if _, ok := REGISTRY[n.Type]; !ok {
			return "", fmt.Errorf("unknown node type: %s", n.Type)
		}
		if err := checkIdent("node.id", n.ID); err != nil {
			return "", err
		}
	}
	for _, e := range spec.Edges {
		if err := checkIdent("edge.label", e.Label); err != nil {
			return "", err
		}
		if err := checkIdent("edge.source", e.Source); err != nil {
			return "", err
		}
		if err := checkIdent("edge.target", e.Target); err != nil {
			return "", err
		}
		if err := checkIdent("edge.sourceHandle", e.SourceHandle); err != nil {
			return "", err
		}
		if err := checkIdent("edge.targetHandle", e.TargetHandle); err != nil {
			return "", err
		}
	}
	// node → port → channel name (inputs)
	inEdges := map[string]map[string]string{}
	// node → port → []channel name (outputs; slice for multi)
	outEdges := map[string]map[string][]string{}
	for _, e := range spec.Edges {
		if inEdges[e.Target] == nil {
			inEdges[e.Target] = map[string]string{}
		}
		if outEdges[e.Source] == nil {
			outEdges[e.Source] = map[string][]string{}
		}
		inEdges[e.Target][e.TargetHandle] = e.Label
		outEdges[e.Source][e.SourceHandle] = append(outEdges[e.Source][e.SourceHandle], e.Label)
	}

	var b strings.Builder
	b.WriteString("// Code generated by topogen — DO NOT EDIT.\n\n")
	b.WriteString("package Wiring\n\n")

	// Imports — only the packages of node types actually used.
	imports := map[string]string{}
	for _, n := range spec.Nodes {
		bind := REGISTRY[n.Type]
		imports[bind.Alias] = bind.Pkg
	}
	imports["S"] = "github.com/dtauraso/congenial-octo-pancake/SafeWorker"
	b.WriteString("import (\n")
	for _, alias := range sortedKeys(imports) {
		fmt.Fprintf(&b, "\t%s \"%s\"\n", alias, imports[alias])
	}
	b.WriteString(")\n\n")

	b.WriteString("func Wire() []S.Node {\n")

	// 1. Channel allocations (one per edge).
	b.WriteString("\t// Channels\n")
	for _, e := range spec.Edges {
		fmt.Fprintf(&b, "\t%s := make(chan int, 1)\n", e.Label)
	}

	// 2. Edge priming (for cycle-closer feedback channels).
	primed := false
	for _, e := range spec.Edges {
		for _, v := range e.InitVals() {
			if !primed {
				b.WriteString("\n\t// Edge priming\n")
				primed = true
			}
			fmt.Fprintf(&b, "\t%s <- %d\n", e.Label, v)
		}
	}

	// 3. Input externals (chans pre-loaded with init values for Input nodes).
	hasInputs := false
	for _, n := range spec.Nodes {
		if !REGISTRY[n.Type].HasInputChan {
			continue
		}
		if !hasInputs {
			b.WriteString("\n\t// Input externals\n")
			hasInputs = true
		}
		init := []int{}
		if n.Data != nil {
			init = n.Data.Init
		}
		bufSize := len(init)
		if bufSize == 0 {
			bufSize = 1
		}
		chanName := n.ID + "Input"
		fmt.Fprintf(&b, "\t%s := make(chan int, %d)\n", chanName, bufSize)
		for _, v := range init {
			fmt.Fprintf(&b, "\t%s <- %d\n", chanName, v)
		}
	}

	// 4. Dead-end output channels (output ports with no edge — the struct field
	//    still needs a non-nil channel so sends don't block forever).
	deadends := map[string]string{} // node:port → chanName
	hasDeadends := false
	for _, n := range spec.Nodes {
		bind := REGISTRY[n.Type]
		for _, port := range sortedKeys(bind.Outputs) {
			if len(outEdges[n.ID][port]) > 0 {
				continue
			}
			if !hasDeadends {
				b.WriteString("\n\t// Dead-end outputs\n")
				hasDeadends = true
			}
			chanName := n.ID + capitalize(port)
			fmt.Fprintf(&b, "\t%s := make(chan int, 1)\n", chanName)
			deadends[n.ID+":"+port] = chanName
		}
	}

	// 5. Node struct literals.
	b.WriteString("\n\t// Nodes\n")
	for _, n := range spec.Nodes {
		bind := REGISTRY[n.Type]
		var fields []string
		idx := 0
		if n.Index != nil {
			idx = *n.Index
		}
		fields = append(fields, fmt.Sprintf("Id: %d", idx))
		fields = append(fields, fmt.Sprintf("Name: %q", n.ID))
		if bind.HasInputChan {
			fields = append(fields, fmt.Sprintf("%s: %sInput", bind.InputField, n.ID))
		}
		for _, port := range sortedKeys(bind.Inputs) {
			pb := bind.Inputs[port]
			if ch, ok := inEdges[n.ID][port]; ok {
				fields = append(fields, fmt.Sprintf("%s: %s", pb.Field, ch))
			}
		}
		for _, port := range sortedKeys(bind.Outputs) {
			pb := bind.Outputs[port]
			chans := outEdges[n.ID][port]
			if len(chans) == 0 {
				if dead, ok := deadends[n.ID+":"+port]; ok {
					fields = append(fields, fmt.Sprintf("%s: %s", pb.Field, dead))
				}
				continue
			}
			if pb.Multi {
				fields = append(fields, fmt.Sprintf("%s: []chan<- int{%s}", pb.Field, strings.Join(chans, ", ")))
			} else {
				fields = append(fields, fmt.Sprintf("%s: %s", pb.Field, chans[0]))
			}
		}
		fmt.Fprintf(&b, "\t%s := %s.%s{%s}\n", n.ID, bind.Alias, bind.Struct, strings.Join(fields, ", "))
	}

	// 6. Return slice.
	b.WriteString("\n\treturn []S.Node{")
	for i, n := range spec.Nodes {
		if i > 0 {
			b.WriteString(", ")
		}
		fmt.Fprintf(&b, "&%s", n.ID)
	}
	b.WriteString("}\n")
	b.WriteString("}\n")

	return b.String(), nil
}

func sortedKeys[V any](m map[string]V) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func capitalize(s string) string {
	if s == "" {
		return s
	}
	return strings.ToUpper(s[:1]) + s[1:]
}
