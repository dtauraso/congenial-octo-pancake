// builders.go — reflection-driven port-manifest and node construction.
//
// Adding a kind: register one entry in kindRegistry. The struct fields
// determine the port manifest automatically:
//   - <-chan int  → PortIn
//   - chan<- int  → PortOut
//   - []chan<- int → PortOutMulti
//   - all other field types are ignored
//
// Kind-specific non-channel setup (HeldValue, Input pre-fill, etc.) goes in
// the optional populate func on the registry entry.

package Wiring

import (
	"fmt"
	"reflect"

	AG "github.com/dtauraso/wirefold/nodes/AndGateNode"
	CI "github.com/dtauraso/wirefold/nodes/ChainInhibitorNode"
	EI "github.com/dtauraso/wirefold/nodes/EdgeInhibitorNode"
	EN "github.com/dtauraso/wirefold/nodes/EdgeNode"
	IRG "github.com/dtauraso/wirefold/nodes/InhibitRightGateNode"
	INN "github.com/dtauraso/wirefold/nodes/InhibitorNode"
	IPN "github.com/dtauraso/wirefold/nodes/InputNode"
	PN "github.com/dtauraso/wirefold/nodes/PartitionNode"
	RGN "github.com/dtauraso/wirefold/nodes/ReadGateNode"
	RLN "github.com/dtauraso/wirefold/nodes/ReadLatchNode"
	S "github.com/dtauraso/wirefold/nodes/SafeWorker"
	SGN "github.com/dtauraso/wirefold/nodes/SyncGateNode"
	TIN "github.com/dtauraso/wirefold/nodes/TransferInhibitorNode"
)

// PortDir describes which direction a port flows.
type PortDir int

const (
	PortIn       PortDir = iota
	PortOut              // single output
	PortOutMulti         // slice output ([]chan<- int)
)

// PortSpec describes one port on a node kind.
type PortSpec struct {
	Name string
	Dir  PortDir
}

// PortBindings holds resolved channels keyed by port name.
// For PortOutMulti ports, use PortBindings.Multi(name).
type PortBindings struct {
	single map[string]chan int
	multi  map[string][]chan int
}

func newPortBindings() PortBindings {
	return PortBindings{
		single: map[string]chan int{},
		multi:  map[string][]chan int{},
	}
}

func (pb *PortBindings) SetSingle(name string, ch chan int) { pb.single[name] = ch }

func (pb *PortBindings) AppendMulti(name string, ch chan int) {
	pb.multi[name] = append(pb.multi[name], ch)
}

func (pb *PortBindings) In(name string) <-chan int {
	ch := pb.single[name]
	if ch == nil {
		ch = make(chan int, 1)
	}
	return ch
}

func (pb *PortBindings) Out(name string) chan<- int {
	ch := pb.single[name]
	if ch == nil {
		ch = make(chan int, 1)
	}
	return ch
}

func (pb *PortBindings) OutSlice(name string) []chan<- int {
	chs := pb.multi[name]
	result := make([]chan<- int, len(chs))
	for i, c := range chs {
		result[i] = c
	}
	return result
}

// kindEntry is one entry in the kind registry.
type kindEntry struct {
	// newNode returns a fresh zero-valued pointer to the node struct.
	newNode func() any
	// populate optionally sets non-channel fields after channels are wired.
	// id and name are already set before populate is called.
	populate func(id int, name string, data *NodeData, node any)
}

var (
	tChanIntRecv = reflect.TypeOf((<-chan int)(nil))
	tChanIntSend = reflect.TypeOf((chan<- int)(nil))
	tSliceSend   = reflect.TypeOf(([]chan<- int)(nil))
)

// reflectPorts walks the exported fields of the struct pointed to by sample
// and returns a PortSpec for each channel field that carries int.
// Chan-of-chan fields and non-channel fields are silently skipped.
func reflectPorts(sample any) []PortSpec {
	t := reflect.TypeOf(sample).Elem()
	var ports []PortSpec
	for i := 0; i < t.NumField(); i++ {
		f := t.Field(i)
		switch f.Type {
		case tChanIntRecv:
			ports = append(ports, PortSpec{Name: f.Name, Dir: PortIn})
		case tChanIntSend:
			ports = append(ports, PortSpec{Name: f.Name, Dir: PortOut})
		case tSliceSend:
			ports = append(ports, PortSpec{Name: f.Name, Dir: PortOutMulti})
		}
	}
	return ports
}

// reflectBuild wires pb into the struct pointed to by nodePtr via reflection,
// then returns it cast to S.Node.
func reflectBuild(id int, name string, data *NodeData, pb PortBindings, e kindEntry) (S.Node, error) {
	nodePtr := e.newNode()
	v := reflect.ValueOf(nodePtr).Elem()

	// Set Id and Name if the struct has them.
	if f := v.FieldByName("Id"); f.IsValid() && f.CanSet() {
		f.SetInt(int64(id))
	}
	if f := v.FieldByName("Name"); f.IsValid() && f.CanSet() {
		f.SetString(name)
	}

	// Wire channel fields.
	ports := reflectPorts(nodePtr)
	for _, port := range ports {
		f := v.FieldByName(port.Name)
		if !f.IsValid() || !f.CanSet() {
			continue
		}
		switch port.Dir {
		case PortIn:
			ch := pb.In(port.Name)
			f.Set(reflect.ValueOf(ch))
		case PortOut:
			ch := pb.Out(port.Name)
			f.Set(reflect.ValueOf(ch))
		case PortOutMulti:
			sl := pb.OutSlice(port.Name)
			f.Set(reflect.ValueOf(sl))
		}
	}

	// Kind-specific non-channel population.
	if e.populate != nil {
		e.populate(id, name, data, nodePtr)
	}

	node, ok := nodePtr.(S.Node)
	if !ok {
		return nil, fmt.Errorf("reflectBuild: %T does not implement S.Node", nodePtr)
	}
	return node, nil
}

// kindRegistry maps spec kind name → kindEntry.
var kindRegistry = map[string]kindEntry{
	"Input": {
		newNode: func() any { return &IPN.InputNode{} },
		populate: func(id int, name string, data *NodeData, node any) {
			n := node.(*IPN.InputNode)
			init := []int{}
			if data != nil {
				init = data.Init
			}
			buf := len(init)
			if buf < 1 {
				buf = 1
			}
			ch := make(chan int, buf)
			for _, v := range init {
				ch <- v
			}
			n.Input = ch
		},
	},
	"ReadGate": {newNode: func() any { return &RGN.ReadGateNode{} }},
	"ChainInhibitor": {
		newNode: func() any { return &CI.ChainInhibitorNode{} },
		populate: func(id int, name string, data *NodeData, node any) {
			n := node.(*CI.ChainInhibitorNode)
			if data != nil {
				if v, ok := data.InitialSlots["held"]; ok {
					n.HeldValue = v
				}
			}
			if len(n.ToEdge) == 0 {
				n.ToEdge = []chan<- int{make(chan int, 1)}
			}
		},
	},
	"InhibitRightGate": {newNode: func() any { return &IRG.InhibitRightGateNode{} }},
	"AndGate":          {newNode: func() any { return &AG.AndGateNode{} }},
	"ReadLatch":        {newNode: func() any { return &RLN.ReadLatchNode{} }},
	"SyncGate":         {newNode: func() any { return &SGN.SyncGateNode{} }},
	"Inhibitor": {
		newNode: func() any { return &INN.InhibitorNode{} },
		populate: func(id int, name string, data *NodeData, node any) {
			n := node.(*INN.InhibitorNode)
			n.TransferEndPartitionChannelFromCurrentInhibitorToNextInhibitor = make(chan chan<- int, 1)
			rcv := make(chan chan<- int, 1)
			n.TransferEndPartitionChannelFromPrevInhibitorToCurrentInhibitor = rcv
		},
	},
	"Partition": {newNode: func() any { return &PN.PartitionNode{} }},
	"Edge":      {newNode: func() any { return &EN.EdgeNode{} }},
	"TransferInhibitor": {
		newNode: func() any { return &TIN.TransferInhibitorNode{} },
		populate: func(id int, name string, data *NodeData, node any) {
			n := node.(*TIN.TransferInhibitorNode)
			rcv := make(chan chan<- int, 1)
			n.TransferIn = rcv
			n.TransferOut = make(chan chan<- int, 1)
		},
	},
	"EdgeInhibitor": {newNode: func() any { return &EI.EdgeInhibitorNode{} }},
}

// NodeBuilder is the public-facing type consumed by the loader.
// Ports is derived lazily from reflection; Build delegates to reflectBuild.
type NodeBuilder struct {
	Ports []PortSpec
	Build func(id int, name string, data *NodeData, pb PortBindings) (S.Node, error)
}

// Registry is the loader-facing map, built once at init from kindRegistry.
var Registry map[string]NodeBuilder

func init() {
	Registry = make(map[string]NodeBuilder, len(kindRegistry))
	for kind, e := range kindRegistry {
		e := e // capture
		sample := e.newNode()
		ports := reflectPorts(sample)
		Registry[kind] = NodeBuilder{
			Ports: ports,
			Build: func(id int, name string, data *NodeData, pb PortBindings) (S.Node, error) {
				return reflectBuild(id, name, data, pb, e)
			},
		}
	}
}

// kindPorts returns the port specs for a kind, or an error if unknown.
func kindPorts(kind string) ([]PortSpec, error) {
	b, ok := Registry[kind]
	if !ok {
		return nil, fmt.Errorf("unknown node kind %q", kind)
	}
	return b.Ports, nil
}
