// builders.go — per-kind builder registry for the runtime topology loader.
//
// Each builder declares its port manifest and constructs the node struct
// from a PortBindings map. Slice ports (e.g. ChainInhibitor.ToEdge) receive
// all outbound channels in the order they appear in PortBindings.
//
// chan-of-chan ports (Inhibitor, TransferInhibitor) are not encoded in
// topology.json edges; dead-end channels of the correct type are allocated
// so the struct constructs cleanly.

package Wiring

import (
	"fmt"

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
	PortIn    PortDir = iota
	PortOut           // single output
	PortOutMulti      // slice output ([]chan<- int)
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

func (pb *PortBindings) SetSingle(name string, ch chan int) {
	pb.single[name] = ch
}

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

// NodeBuilder constructs a node from its spec and port bindings.
type NodeBuilder struct {
	Ports []PortSpec
	Build func(id int, name string, data *NodeData, pb PortBindings) (S.Node, error)
}

// deadChanOfChan returns a dead-end chan<- chan<- int (cap 1).
func deadChanOfChan() chan<- chan<- int {
	ch := make(chan chan<- int, 1)
	return ch
}

// deadChanFromChanOfChan returns a dead-end <-chan chan<- int (cap 1).
func deadChanFromChanOfChan() <-chan chan<- int {
	ch := make(chan chan<- int, 1)
	return ch
}

// Registry maps kind name → NodeBuilder.
var Registry = map[string]NodeBuilder{
	"Input": {
		Ports: []PortSpec{
			{Name: "ToOut", Dir: PortOut},
		},
		Build: func(id int, name string, data *NodeData, pb PortBindings) (S.Node, error) {
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
			n := &IPN.InputNode{
				Id:     id,
				Name:   name,
				Input:  ch,
				ToNext: pb.Out("ToOut"),
			}
			return n, nil
		},
	},

	"ReadGate": {
		Ports: []PortSpec{
			{Name: "FromValue", Dir: PortIn},
			{Name: "FromAck", Dir: PortIn},
			{Name: "ToGated", Dir: PortOut},
		},
		Build: func(id int, name string, data *NodeData, pb PortBindings) (S.Node, error) {
			n := &RGN.ReadGateNode{
				Id:        id,
				Name:      name,
				FromValue: pb.In("FromValue"),
				FromAck:   pb.In("FromAck"),
				ToGated:   pb.Out("ToGated"),
			}
			return n, nil
		},
	},

	"ChainInhibitor": {
		Ports: []PortSpec{
			{Name: "FromPrev", Dir: PortIn},
			{Name: "ToNext", Dir: PortOut},
			{Name: "ToAck", Dir: PortOut},
			{Name: "ToEdge", Dir: PortOutMulti},
		},
		Build: func(id int, name string, data *NodeData, pb PortBindings) (S.Node, error) {
			held := 0
			if data != nil {
				if v, ok := data.InitialSlots["held"]; ok {
					held = v
				}
			}
			toEdge := pb.OutSlice("ToEdge")
			if len(toEdge) == 0 {
				toEdge = []chan<- int{make(chan int, 1)}
			}
			n := &CI.ChainInhibitorNode{
				Id:        id,
				Name:      name,
				HeldValue: held,
				FromPrev:  pb.In("FromPrev"),
				ToNext:    pb.Out("ToNext"),
				ToAck:     pb.Out("ToAck"),
				ToEdge:    toEdge,
			}
			return n, nil
		},
	},

	"InhibitRightGate": {
		Ports: []PortSpec{
			{Name: "FromLeft", Dir: PortIn},
			{Name: "FromRight", Dir: PortIn},
			{Name: "ToPassed", Dir: PortOut},
		},
		Build: func(id int, name string, data *NodeData, pb PortBindings) (S.Node, error) {
			n := &IRG.InhibitRightGateNode{
				Id:        id,
				Name:      name,
				FromLeft:  pb.In("FromLeft"),
				FromRight: pb.In("FromRight"),
				ToPassed:  pb.Out("ToPassed"),
			}
			return n, nil
		},
	},

	"AndGate": {
		Ports: []PortSpec{
			{Name: "FromA", Dir: PortIn},
			{Name: "FromB", Dir: PortIn},
			{Name: "ToOut", Dir: PortOut},
		},
		Build: func(id int, name string, data *NodeData, pb PortBindings) (S.Node, error) {
			n := &AG.AndGateNode{
				Id:    id,
				Name:  name,
				FromA: pb.In("FromA"),
				FromB: pb.In("FromB"),
				ToOut: pb.Out("ToOut"),
			}
			return n, nil
		},
	},

	"ReadLatch": {
		Ports: []PortSpec{
			{Name: "FromIn", Dir: PortIn},
			{Name: "FromRelease", Dir: PortIn},
			{Name: "ToNext", Dir: PortOut},
			{Name: "ToAck", Dir: PortOut},
		},
		Build: func(id int, name string, data *NodeData, pb PortBindings) (S.Node, error) {
			n := &RLN.ReadLatchNode{
				Id:          id,
				Name:        name,
				FromIn:      pb.In("FromIn"),
				FromRelease: pb.In("FromRelease"),
				ToNext:      pb.Out("ToNext"),
				ToAck:       pb.Out("ToAck"),
			}
			return n, nil
		},
	},

	"SyncGate": {
		Ports: []PortSpec{
			{Name: "FromA", Dir: PortIn},
			{Name: "FromB", Dir: PortIn},
			{Name: "ToRelease", Dir: PortOut},
		},
		Build: func(id int, name string, data *NodeData, pb PortBindings) (S.Node, error) {
			n := &SGN.SyncGateNode{
				Id:        id,
				Name:      name,
				FromA:     pb.In("FromA"),
				FromB:     pb.In("FromB"),
				ToRelease: pb.Out("ToRelease"),
			}
			return n, nil
		},
	},

	"Inhibitor": {
		// chan-of-chan ports (TransferEndPartitionChannel*) are not encoded in
		// topology.json; allocate dead-end channels so the struct constructs.
		Ports: []PortSpec{
			{Name: "FromPrevInhibitor", Dir: PortIn},
			{Name: "ToNextInhibitor", Dir: PortOut},
			{Name: "ToEdgeNode", Dir: PortOut},
			{Name: "FromEdgeNode", Dir: PortIn},
			{Name: "ToRecognitionAndGate", Dir: PortOut},
			{Name: "EndFromPartition", Dir: PortIn},
			{Name: "EndToPartition", Dir: PortOut},
		},
		Build: func(id int, name string, data *NodeData, pb PortBindings) (S.Node, error) {
			n := &INN.InhibitorNode{
				Id:                id,
				FromPrevInhibitor: pb.In("FromPrevInhibitor"),
				ToNextInhibitor:   pb.Out("ToNextInhibitor"),
				ToEdgeNode:        pb.Out("ToEdgeNode"),
				FromEdgeNode:      pb.In("FromEdgeNode"),
				ToRecognitionAndGate: pb.Out("ToRecognitionAndGate"),
				EndFromPartition:  pb.In("EndFromPartition"),
				EndToPartition:    pb.Out("EndToPartition"),
				TransferEndPartitionChannelFromCurrentInhibitorToNextInhibitor: deadChanOfChan(),
				TransferEndPartitionChannelFromPrevInhibitorToCurrentInhibitor: deadChanFromChanOfChan(),
			}
			return n, nil
		},
	},

	"Partition": {
		Ports: []PortSpec{
			{Name: "FromIn", Dir: PortIn},
			{Name: "ToOut", Dir: PortOut},
		},
		Build: func(id int, name string, data *NodeData, pb PortBindings) (S.Node, error) {
			n := &PN.PartitionNode{
				Id:     id,
				Name:   name,
				FromIn: pb.In("FromIn"),
				ToOut:  pb.Out("ToOut"),
			}
			return n, nil
		},
	},

	"Edge": {
		Ports: []PortSpec{
			{Name: "FromLeft", Dir: PortIn},
			{Name: "FromRight", Dir: PortIn},
			{Name: "ToInhibitor", Dir: PortOut},
			{Name: "ToPartition", Dir: PortOut},
			{Name: "ToNextEdge", Dir: PortOut},
		},
		Build: func(id int, name string, data *NodeData, pb PortBindings) (S.Node, error) {
			n := &EN.EdgeNode{
				Id:          id,
				Name:        name,
				FromLeft:    pb.In("FromLeft"),
				FromRight:   pb.In("FromRight"),
				ToInhibitor: pb.Out("ToInhibitor"),
				ToPartition: pb.Out("ToPartition"),
				ToNextEdge:  pb.Out("ToNextEdge"),
			}
			return n, nil
		},
	},

	"TransferInhibitor": {
		// TransferIn / TransferOut are chan<-chan<-int / <-chan chan<-int; not
		// expressible as plain topology.json edges. Allocate dead-ends.
		Ports: []PortSpec{
			{Name: "EndTo", Dir: PortOut},
		},
		Build: func(id int, name string, data *NodeData, pb PortBindings) (S.Node, error) {
			n := &TIN.TransferInhibitorNode{
				Id:          id,
				EndTo:       pb.Out("EndTo"),
				TransferIn:  deadChanFromChanOfChan(),
				TransferOut: deadChanOfChan(),
			}
			return n, nil
		},
	},

	"EdgeInhibitor": {
		Ports: []PortSpec{
			{Name: "FromPrev", Dir: PortIn},
			{Name: "ToEdge", Dir: PortOut},
			{Name: "FromEdge", Dir: PortIn},
		},
		Build: func(id int, name string, data *NodeData, pb PortBindings) (S.Node, error) {
			n := &EI.EdgeInhibitorNode{
				Id:       id,
				FromPrev: pb.In("FromPrev"),
				ToEdge:   pb.Out("ToEdge"),
				FromEdge: pb.In("FromEdge"),
			}
			return n, nil
		},
	},
}

// kindPorts returns the port specs for a kind, or an error if unknown.
func kindPorts(kind string) ([]PortSpec, error) {
	b, ok := Registry[kind]
	if !ok {
		return nil, fmt.Errorf("unknown node kind %q", kind)
	}
	return b.Ports, nil
}
