class Node():
    def __init__(self, number=0):
        self.next = None
        self.number = number
        self.parent = None

    def __str__(self):
        next = id(self.next) if self.next is not None else None
        parent = id(self.parent) if self.parent is not None else None

        return f"{id(self)}: number: {self.number}, next: {next}, parent: {parent}"