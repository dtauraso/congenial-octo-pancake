// registry.go — self-registration API for node kinds.
// Each node package calls Wiring.Register in its own init().

package Wiring

import S "github.com/dtauraso/wirefold/nodes/SafeWorker"

// Populator optionally sets non-channel fields after channels are wired.
// id and name are already set before populate is called.
type Populator func(id int, name string, data *NodeData, node any)

// kindEntry is one entry in the kind registry.
type kindEntry struct {
	// newNode returns a fresh zero-valued pointer to the node struct.
	newNode func() any
	// populate optionally sets non-channel fields after channels are wired.
	populate Populator
}

// kindRegistry maps spec kind name → kindEntry.
var kindRegistry = map[string]kindEntry{}

// Register adds kind to kindRegistry and Registry. Panics if kind is already registered.
func Register(kind string, newNode func() any, populate Populator) {
	if _, exists := kindRegistry[kind]; exists {
		panic("Wiring.Register: kind already registered: " + kind)
	}
	e := kindEntry{newNode: newNode, populate: populate}
	kindRegistry[kind] = e
	// Also populate the loader-facing Registry immediately.
	sample := e.newNode()
	ports := reflectPorts(sample)
	Registry[kind] = NodeBuilder{
		Ports: ports,
		Build: func(id int, name string, data *NodeData, pb PortBindings) (S.Node, error) {
			return reflectBuild(id, name, data, pb, e)
		},
	}
}
