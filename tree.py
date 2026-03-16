import level
import node

class Tree():
    def __init__(self):
        self.levels = [level.Level(), level.Level(), level.Level()]
    
    def process(self, node):
        tracker_node = node
        for level in self.levels:
            parent_node = level.process(tracker_node)
            tracker_node = parent_node
            if tracker_node is None:
                break

    def print(self):
        print("-----------------------")
        for i, level in enumerate(self.levels):
            print(f"level {i}")
            level.print()
            print("-----------------------")


def x1():

    tree = Tree()
    tree.process(node.Node(2))
    tree.print()
    print()
    print()
    tree.process(node.Node(2))
    tree.print()
    print("1")
    tree.process(node.Node(1))
    tree.print()

    print()
    tree.process(node.Node(3))
    tree.print()

    print("repeat path")
    tree.process(node.Node(2))
    tree.print()

    tree.process(node.Node(2))
    tree.print()





x1()