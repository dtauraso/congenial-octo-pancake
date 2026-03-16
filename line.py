import multiprocessing
import time
import node2

class Line():
    def __init__(self):
        node_1 = node2.Node2(0)
        node_2 = node2.Node2(1)
        node_3 = node2.Node2(2)
        node_4 = node2.Node2(3)

        node_1.next = node_2
        node_2.prev = node_1
        node_2.next = node_3
        node_3.prev = node_2
        node_3.next = node_4
        node_4.prev = node_3
        self.line = [node_1, node_2, node_3, node_4]

    def process(self, digit):
        print(f"{digit}")
        self.line[0].input = digit
        for i, node in enumerate(self.line):
            # print(f"i: {i}")
            # for node2 in self.line:
            #     print(node2)
            # print()
            node.process()

        # print(f"i: {len(self.line)-1}")
        for node2 in self.line:
                print(node2)
        print()

    def process2(self, digit):
        print(f"{digit}")
        self.line[0].number += digit
        for i, node in enumerate(self.line):
            # print(f"i: {i}")
            # for node2 in self.line:
            #     print(node2)
            # print()
            node.process2()

        # print(f"i: {len(self.line)-1}")
        for node2 in self.line:
                print(node2)
        print()
def x():
    input_list = [1, 1, 0, 1, 0, -1, -1, -1]
    input_list2 = [1, 0, 1, 1, 0, -1]

    x = Line()
    for node in x.line:
        print(node)

    print("input 1")
    for input in input_list:
        x.process2(input)
    print("input 2")
    for input in input_list2:
        x.process2(input)


if __name__ == '__main__':
    x = Line()
    processes = [multiprocessing.Process(target=node.process3, args=(node,)) for node in x.line]
    x.line[0].number += 2
    for process in processes:
         process.start()
    time.sleep(0.5)
    for process in processes:
        process.kill()
    for node in x.line:
        print(node)

