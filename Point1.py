class Point1():

    def __init__(self, id, prev=None, next=None, order_id=0, lateral=None, line=None):
        self.prev = prev
        self.next = next
        self.id = id
        self.order_id = order_id
        if lateral is None:
            self.lateral = []
        self.children = []
        self.line = line

    def __str__(self):
        next = None if self.next is None else id(self.next)
        lateral = None if self.lateral is None else id(self.lateral)
        return f"(Point1 id: {id(self)}, next: {next}, lateral: {lateral})"

    def printPoint(self):
        print(f"{self}")
        children = [] if self.children is None else [id(child) for child in self.children if child is not None]
        if len(children) > 0:
            print(f"    children:")
            for child in children:
                print(f"        {child}")