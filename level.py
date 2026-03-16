import node as n
class Level():
    def __init__(self):
        self.sums = [[n.Node()],
                     [n.Node()], 
                     [n.Node()],
                     [n.Node()],
                     [n.Node()],
                     [n.Node()],
                     [n.Node()],
                     [n.Node()],
                     [n.Node()]]
        self.node_tracker = None

    def process(self, node):
        if self.sums[node.number][0].number == 0:
            self.sums[node.number][0] = n.Node(node.number)
        if self.node_tracker is None:
            self.node_tracker = self.sums[node.number][0]
        elif self.node_tracker is not None:
            if self.node_tracker.next is None:
                first_sum = self.node_tracker.number
                new_sum = first_sum + node.number
                if first_sum == node.number:
                    self.sums[node.number].append(node)
                offset = -2 if first_sum == node.number else -1
                self.sums[first_sum][offset].next = self.sums[node.number][-1]
                parent_node = n.Node(new_sum)
                self.sums[first_sum][offset].parent = parent_node
                self.sums[node.number][-1].parent = parent_node
                self.node_tracker = None
                return parent_node
            elif self.node_tracker.next is not None:
                return self.node_tracker.parent
    
    def print(self):
        for sum, nodes in enumerate(self.sums):
            print(f"{sum}")
            for node in nodes:
                print(f"{node}")
        print(f"node tracker: {self.node_tracker}")
