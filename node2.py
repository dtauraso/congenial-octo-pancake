class Node2():
    def __init__(self, id=0):
        self.id = id
        self.input = -2
        self.number = 0
        self.stable_flag = False
        self.prev = None
        self.next = None
        self.lost_data = False
        self.parent = None
        self.persistance_count = 0

    def __str__(self):

        return f"(id: {self.id}, number: {self.number}, persistance_count: {self.persistance_count}, stable_flag: {self.stable_flag})"
    
    def process2(self):
        # print(self)
        if self.number == 0:
            if self.next is not None:
                if self.next.number == 1:
                    self.next.number, self.number = self.number, self.next.number
                    self.persistance_count = 0
        elif self.number == 1:
            if self.next is not None:
                if self.next.number == 0:
                    print(f"{self.persistance_count}")
                    if self.persistance_count == 0:
                        self.persistance_count += 1
                    elif self.persistance_count == 1:
                        self.persistance_count = 0
                        if not self.stable_flag:
                            self.stable_flag = True
                            print(f"{self.id} new stable flag added")
                        else:
                            print(f"{self.id} repeat")
        elif self.number == 2:
            if self.next is not None:
                self.next.number += 1
                self.number = 1
                self.persistance_count = 0

    def process3(self):

        while True:
            self.process2()
            # print("running")