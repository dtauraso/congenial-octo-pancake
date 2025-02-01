import random

class MaxHeap:
    def __init__(self):
        self.heap = []
        self.max_length = 0        
    def insert(self, element):
        self.heap.append(element)
        self._heapify_up(len(self.heap) - 1)
        self.max_length = max(self.max_length, len(self.heap))

    def extract_max(self):
        if len(self.heap) == 0:
            return None
        if len(self.heap) == 1:
            return self.heap.pop()
        root = self.heap[0]
        self.heap[0] = self.heap.pop()
        self._heapify_down(0)
        return root

    def update(self, key, new_value):
        index = self._find_index(key)
        if index is not None:
            old_value = self.heap[index]["growth"]
            self.heap[index]["growth"] = new_value
            if new_value > old_value:
                self._heapify_up(index)
            else:
                self._heapify_down(index)
    def findItem(self, key):
        index = self._find_index(key)
        if index is not None:
            return self.heap[index]
        return None
    def decrementItems(self):
        i = 0
        while i < len(self.heap):
            element = self.heap[i]
            if element["growth"] > 0:
                self.heap[i]["growth"] -= 1
                if self.heap[i]["growth"] == 0:
                    self.heap = self.heap[:i] + self.heap[i+1:]
                    i -= 1
            i += 1
    def _find_index(self, key):
        for i, element in enumerate(self.heap):
            if element["number"] == key:
                return i
        return None

    def _heapify_up(self, index):
        """
        Restore the heap property from bottom to top at the given index
        by swapping the element at the given index with its parent if
        necessary. This is used after inserting a new element into the heap.
        """
        parent_index = (index - 1) // 2
        if index > 0 and self.heap[index]["growth"] > self.heap[parent_index]["growth"]:
            self.heap[index], self.heap[parent_index] = self.heap[parent_index], self.heap[index]
            self._heapify_up(parent_index)

    def _heapify_down(self, index):
        """
        Restore the heap property from top to bottom at the given index
        by swapping the element at the given index with its largest child if
        necessary. This is used after extracting the maximum element from the heap.
        """
        left_child_index = 2 * index + 1
        right_child_index = 2 * index + 2
        largest = index

        if left_child_index < len(self.heap) and self.heap[left_child_index]["growth"] > self.heap[largest]["growth"]:
            largest = left_child_index
        if right_child_index < len(self.heap) and self.heap[right_child_index]["growth"] > self.heap[largest]["growth"]:
            largest = right_child_index
        if largest != index:
            self.heap[index], self.heap[largest] = self.heap[largest], self.heap[index]
            self._heapify_down(largest)

class Point():

    def __init__(self, line=None, value=0):
        self.prev = None
        self.next = None
        self.value = value
        self.expansion = 0
        self.contraction = 0
        self.baseline = 0
        self.line = line

    def __str__(self):
        return f"(point id: {id(self)}, value: {self.value}, baseline: {self.baseline}, expansion: {self.expansion}, contraction: {self.contraction})"

    def incrementBaseline(self):
        self.contraction = 0
        self.baseline += 1
        self.expansion = -1 * self.baseline

    def resetExpansionAndContraction(self):
        self.contraction = 0
        self.expansion = -1 * self.baseline

    def initNextPoint(self, j, length):
        self.contraction = 0
        self.baseline = 1
        self.expansion = 1
        if j == length:
            self.expansion = -1

    def printPoint(self):
        next = None if self.next is None else id(self.next)
        prev = None if self.prev is None else id(self.prev)
        print(f"{id(self)}: next: {next}, prev: {prev}")
class Line():
    
    def __init__(self, id, level):
        self.id = id
        self.baseline = 0
        self.expansion = 0
        self.reward = 0
        self.is_visited = False
        self.points = []
        self.level = level
    
    def addPoint(self, point):

        print(f"adding point point: {id(point)}")
        self.points.append(point)

    def removePoint(self):
        self.points.pop()

    def printLine(self):

        print(f"    expansion: {self.expansion}")
        for i, point in enumerate(self.points):
            print(f"    {i}:")

            next = None if point.next is None else id(point.next)
            prev = None if point.prev is None else id(point.prev)
            print(f"    {id(point)}: next: {next}, prev: {prev}")

class Level():
    def __init__(self, sequence=None):
        self.lines = {}
        self.sequence = sequence

    def __str__(self):
        return f"(lines: {self.lines})"
    def addLine(self, number):
        new_line = Line(number, self)
        self.lines[new_line.id] = new_line
    def cleanup(self, number):
        self.lines[number].removePoint()
 
    def processSequence(self, resistance=None, winning_items=None, items_with_streak_count=None):
        if resistance is None:
            resistance = {}
        if winning_items is None:
            winning_items = {}
        if items_with_streak_count is None:
            items_with_streak_count = {}
        sequence = self.sequence
        resistance_number = 0
        if sequence[0]["number"] in resistance:
            resistance_number = resistance[sequence[0]["number"]]
        items = {sequence[0]["number"]: {"concentration": -1 * resistance_number, "i":-1}}
        current_number = sequence[0]["number"]
        print(f"items: {items} resistance: {resistance} winning_items: {winning_items}")

        for i, item in enumerate(sequence):
            print(f"i: {i} item: {item} items: {items}")
            if item["number"] == current_number:
                items[current_number]["concentration"] += item["concentration"]
                if current_number in resistance:
                    print(f"current_number: {current_number} items[current_number]['concentration']: {items[current_number]['concentration']} resistance_number: {resistance[current_number]} adjustment: {items[current_number]['concentration'] + resistance_number}")
                    if resistance[current_number] == items[current_number]["concentration"] + resistance_number:
                        items_with_streak_count[current_number] = resistance[current_number]
                        if items[current_number]["i"] == -1:
                            items[current_number]["i"] = i
                        print(f"streak count for current_number {current_number} found: {resistance[current_number]}, i: {items[current_number]['i']}")
            if item["number"] != current_number:
                if current_number in items:
                    if items[current_number]["concentration"] - item["concentration"] < 0:
                        items[current_number]["concentration"] = 0
                    else:
                        items[current_number]["concentration"] -= item["concentration"]
                if items[current_number]["concentration"] == 0:
                    new_number = item["number"]
                    items[new_number] = {"concentration": 1}
                    items[new_number]["i"] = i
            print(f"items: {items} resistance: {resistance} winning_items: {winning_items}")

            print()
        new_winning_items = {item: value for item, value in items.items() if item not in winning_items}
        print(f"new_winning_items: {new_winning_items}")
        winning_items = items.copy()
        return winning_items
    def readLine3(self):

        items_with_streak_count = {}
        winning_items = self.processSequence(items_with_streak_count=items_with_streak_count)
        print(f"winning_items: {winning_items}")
        print(f"items_with_streak_count: {items_with_streak_count}")
        print()
        print()
        resistance = {item: 7 for item, value in winning_items.items()}
        winning_items2 = self.processSequence(resistance, winning_items, items_with_streak_count)
        print(f"winning_item: {winning_items2}")
        print(f"items_with_streak_count: {items_with_streak_count}")

    def initLines(self):

        for item in self.sequence:
            line_number = item
            if line_number not in self.lines:
                self.addLine(line_number)
            self.lines[line_number].expansion = random.randint(1, 10)

    def getWinningKey(self, input_key=None):

        winning_key = -1
        count = 0
        for i in range(11):
            for key in self.lines:  
                if input_key in self.lines:
                    if len(self.lines[input_key].points) > 0:
                        winning_key = input_key
                        break
                if self.lines[key].is_visited:
                    continue
                if i >= self.lines[key].expansion:
                    count += 1
                    self.lines[key].is_visited = True
                if count == len(self.lines):
                    winning_key = key
                    break
            if winning_key != -1:
                break
        for key in self.lines:
            self.lines[key].is_visited = False
        return winning_key

    def processSequence2(self):

        # winning_key = self.getWinningKey()
        # print(f"winning_key: {winning_key}")
        if len(self.sequence) == 0:
            return
        root = Point(line=None, value=self.sequence[0])
        root.contraction = 0
        root.baseline = 1
        root.expansion = 1
        for i in range(8):
            current = root
            print(f"i: {i}, current: {current}")
            for j, item in enumerate(self.sequence):
                print(f"i: {i}, j: {j}, item: {item}, current: {current}")
                if current.value == item:
                    current.expansion += 1
                    if j == len(self.sequence) - 1:
                        print(f"last time current.value == item")
                        print(f"i: {i}, j: {j}, item: {item}, current: {current}")
                        if current.expansion > -1:
                            current.incrementBaseline()
                else:
                    if current.expansion == 0 and current.contraction == 0:
                        print(f"streak count found at {current.baseline}")
                        print(f"new item: {item}")
                        current.resetExpansionAndContraction()
                        if current.next is None:
                            print(f"current.next is None 1")
                            next_point = Point(line=None, value=item)
                            next_point.initNextPoint(j, len(self.sequence) - 1)
                            current.next = next_point
                        elif current.next.value == item:
                            print(f"current.next.value == item 1")
                            current.resetExpansionAndContraction()
                            current.next.expansion += 1
                        elif current.next.value != item:
                            print(f"current.next.value != item 1")
                            next_point = Point(line=None, value=item)
                            next_point.initNextPoint(j, len(self.sequence) - 1)
                            next_point.next = current.next
                            current.next = next_point
                        current = current.next
                    elif current.expansion == current.contraction:
                        current.incrementBaseline()
                        if current.next is None:
                            print(f"current.next is None 2")
                            next_point = Point(line=None, value=item)
                            next_point.initNextPoint(j, len(self.sequence) - 1)
                            current.next = next_point
                        elif current.next.value == item:
                            print(f"current.next.value == item 2")
                            current.resetExpansionAndContraction()
                            current.next.expansion += 1
                        elif current.next.value != item:
                            print(f"current.next.value != item 2")
                            next_point = Point(line=None, value=item)
                            next_point.initNextPoint(j, len(self.sequence) - 1)
                            next_point.next = current.next
                            current.next = next_point
                        current = current.next
                    else:
                        if j == len(self.sequence) - 1:
                            print(f"last time current.value != item")
                            current.resetExpansionAndContraction()
                            next_point = Point(line=None, value=item)
                            next_point.initNextPoint(j, len(self.sequence) - 1)
                            current.next = next_point
                        else:
                            current.contraction += 1

            tracker = root
            while tracker is not None:
                print(f"tracker: {tracker}")
                tracker = tracker.next

    def processSequence3(self):

        if len(self.sequence) == 0:
            return
        root = Point(line=None, value=self.sequence[0])
        root.contraction = 0
        root.baseline = 1
        root.expansion = 0
        for i in range(2):
            current = root
            print(f"i: {i}, current: {current}")
            for j, item in enumerate(self.sequence):
                print(f"i: {i}, j: {j}, item: {item}, current: {current}")
                if current.value == item:
                    current.expansion += 1
                    # if j == len(self.sequence) - 1:
                    #     print(f"last time current.value == item")
                    #     print(f"i: {i}, j: {j}, item: {item}, current: {current}")
                    #     if current.expansion > -1:
                    #         current.incrementBaseline()
                else:
                    if current.expansion <= 0:
                        if current.prev is not None:
                            print(f"here")
                            print(f"current.prev.expansion: {current.prev.expansion}, {current.contraction} {current.expansion}")
                            current.prev.expansion -= (current.contraction + current.expansion)
                            current = current.prev
                            current.next = None
                            
                            next_point = Point(line=None, value=item)
                            next_point.prev = current
                            current.next = next_point
                            next_point.baseline = 1
                            next_point.expansion = (-1 * current.expansion) + 1
                            next_point.contraction = current.expansion
                            if current.expansion == 0:
                                current.expansion = -1 * current.baseline
                            current = current.next

                            # tracker = root
                            # while tracker is not None:
                            #     print(f"tracker: {tracker}")
                            #     tracker = tracker.next
                            # print()
                    else:
                        # current.expansion -= current.baseline
                        if current.next is None:
                            next_point = Point(line=None, value=item)
                            next_point.prev = current
                            current.next = next_point
                            next_point.baseline = 1
                            next_point.expansion = (-1 * current.expansion) + 1
                            next_point.contraction = current.expansion
                            current = current.next
                    # if current.expansion == 0 and current.contraction == 0:
                    #     print(f"streak count found at {current.baseline}")
                    #     print(f"new item: {item}")
                    #     current.resetExpansionAndContraction()
                    #     if current.next is None:
                    #         print(f"current.next is None 1")
                    #         next_point = Point(line=None, value=item)
                    #         next_point.initNextPoint(j, len(self.sequence) - 1)
                    #         current.next = next_point
                    #     elif current.next.value == item:
                    #         print(f"current.next.value == item 1")
                    #         current.resetExpansionAndContraction()
                    #         current.next.expansion += 1
                    #     elif current.next.value != item:
                    #         print(f"current.next.value != item 1")
                    #         next_point = Point(line=None, value=item)
                    #         next_point.initNextPoint(j, len(self.sequence) - 1)
                    #         next_point.next = current.next
                    #         current.next = next_point
                    #     current = current.next
                    # elif current.expansion == current.contraction:
                    #     current.incrementBaseline()
                    #     if current.next is None:
                    #         print(f"current.next is None 2")
                    #         next_point = Point(line=None, value=item)
                    #         next_point.initNextPoint(j, len(self.sequence) - 1)
                    #         current.next = next_point
                    #     elif current.next.value == item:
                    #         print(f"current.next.value == item 2")
                    #         current.resetExpansionAndContraction()
                    #         current.next.expansion += 1
                    #     elif current.next.value != item:
                    #         print(f"current.next.value != item 2")
                    #         next_point = Point(line=None, value=item)
                    #         next_point.initNextPoint(j, len(self.sequence) - 1)
                    #         next_point.next = current.next
                    #         current.next = next_point
                    #     current = current.next
                    # else:
                    #     if j == len(self.sequence) - 1:
                    #         print(f"last time current.value != item")
                    #         current.resetExpansionAndContraction()
                    #         next_point = Point(line=None, value=item)
                    #         next_point.initNextPoint(j, len(self.sequence) - 1)
                    #         current.next = next_point
                    #     else:
                    # current.contraction += 1
            if current is not None:
                print(f"{current.value} {current.expansion} {current.contraction}")
                if current.expansion > 0:
                    current.expansion = -1 * current.baseline
                    # current.incrementBaseline()
        tracker = root
        while tracker is not None:
            print(f"tracker: {tracker}")
            tracker = tracker.next


    def printLines(self):
        
        for line_id in self.lines:
            print(f"{line_id}")
            self.lines[line_id].printLine()
class F():
    def __init__(self, sequence=None):
        if sequence is None:
            sequence = []
        self.levels = [Level(sequence)]

def x32():

    # 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 2, 2, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1, 1, 2
    # f = F([1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 2, 2, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1, 1])
    # 2, 2, 2, 3, 4, 5, 6, 7
    f = F([1, 2, 3])

    f.levels[0].initLines()
    f.levels[0].processSequence3()

x32()

def x26():
    x = [1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1]
    counts = {}
    total = len(x)
    items = {}
    count = 0
    lower_threshold = True
    while count < 10:
        i = 0
        print(f"{x}, i:{i}, count: {count}, counts: {counts}, items: {items}")
        # for i, number in enumerate(x):
        while i < len(x):
            number = x[i]
            # print(f"i: {i}, number: {number}")
            if number in counts:
                counts[number] += 1
                if number in items:
                    # print(f"i: {i}, number: {number} lower threshold: {lower_threshold}, counts: {counts}")
                    if lower_threshold:
                        # print(f"i: {i}, counts: {counts}")
                        if counts[number] / total >= items[number]:
                            items[number] = (counts[number] - 1) / total
                            print(f"{number} found at {i}")
                            if items[number] <= .06:
                                x = [j for j in x if j != number]
                                i = -1
                                total = len(x)
                                print(f"removed {number} from x")
                            lower_threshold = False
            else:
                counts[number] = 1
            if number not in items:
                if counts[number] / total >= .5:
                    items[number] = .5
            i += 1
        counts = {}
        lower_threshold = True
        print(f"items: {items}")
        count += 1
    
    # print("Percentage Table:")
    # for number, count in counts.items():
    #     percentage = (count / total) * 100
    #     print(f"Number {number}: {percentage:.2f}%")
class node():
    def __init__(self, number=0, streak_count=0, current_streak_is_too_long=False):
        self.number = number
        self.streak_count = streak_count
        self.current_streak_is_too_long = current_streak_is_too_long
    def decreaseStreakCount(self):
        self.streak_count -= 1
        if self.streak_count < 0:
            self.streak_count = 0
    def increaseStreakCount(self):
        self.streak_count += 1
class graph():
    def __init__(self):
        self.nodes = []
        self.head = -1
    def appendNode(self, node):
        self.nodes.append(node)
        # if self.head == -1:
        #     self.head = 0
        # else:
        #     self.head += 1
    def nextNode(self):
        # if self.head == len(self.nodes) - 1:
        #     self.head = -1
        # else:
        self.head += 1
        if self.head >= len(self.nodes):
            self.head = -1
    def start(self):
        if len(self.nodes) > 0:
            self.head = 0
    def print(self):
        for node in self.nodes:
            print(f"Number: {node.number}, Streak Count: {node.streak_count}, Current Streak Is Too Long: {node.current_streak_is_too_long}")

def updateCounts(counts, number):
    if number in counts:
        counts[number] += 1
    else:
        counts[number] = 1

def updateCounts2(counts, number):
    if number in counts:
        counts[number] += 1
    else:
        counts[number] = 1
    for key in counts:
        if key != number:
            counts[key] -= 1
            if counts[key] < 0:
                counts[key] = 0
def numberLastPosition(x, i, number):
    for j in range(i, len(x)):
        if x[j] != number:
            return j
    return len(x)
def streakCount(x, i, number):
    count = 0
    j = i-1
    while j > 0 and x[j] == number:
        count += 1
        j -= 1
    while i < len(x) and x[i] == number:
        count += 1
        i += 1
    return count
    
def numberChanged(x, i, number):
    for j in range(i, len(x)):
        if x[j] != number:
            return True
    return False

def x27():
    import copy
    x = [1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1]
    tmp = copy.deepcopy(x)
    path = graph()

    count = 0
    while count < 3:
        counts = {}
        i = 0
        print(f"count: {count}")
        while i < len(x):
            number = x[i]
            print(f"i: {i}, path.head: {path.head}")
            updateCounts(counts, number)
            highest_count = max(counts.values())
            highest_count_numbers = {num: cnt for num, cnt in counts.items() if cnt == highest_count}
            highest_count_number = max(highest_count_numbers, key=highest_count_numbers.get)
            print(f"Highest count: {highest_count}, Number: {highest_count_number}")
            percentage = counts[highest_count_number] / len(x)
            percentages = {num: cnt / len(x) for num, cnt in counts.items()}
            print(f"percentages: {percentages}")
            if path.head == -1:
                if percentage >= .7:
                    print(f"highest percentage: {percentage}, i: {i}, len(x): {len(x)}")
                    path.appendNode(node(highest_count_number, percentage, streakCount(x, i, highest_count_number)))
                    x = x[numberLastPosition(x, i, highest_count_number):]
                    if len(path.nodes) > 0:
                        path.head = 0
                    # path.print()
                    print(x)
            else:
                print(len(path.nodes), path.head)
                print(f"highest percentage: {percentage}, path.nodes[path.head].threshold: {path.nodes[path.head].threshold}, i: {i}, len(x): {len(x)}")
                if  percentage >= path.nodes[path.head].threshold:
                    path.nodes[path.head].threshold = (counts[highest_count_number] - 1) / len(x)
                    print(f"new percentage: {(counts[highest_count_number] - 1) / len(x)}")
                    print(f"{counts[highest_count_number] - 1}, {len(x)}")
                    path.nextNode()
                    print(f"path.head: {path.head}")
                    #  1 - path.nodes[path.head - 1].threshold >= second highest percentage
                    # x = x[numberLastPosition(x, i, highest_count_number):]
                    # i = -1
                    if path.head == -1:
                        # x = [j for j in x if j != highest_count_number]
                        # i = -1
                        if not numberChanged(x, i, highest_count_number):
                            i = len(x)
                        # if len(x) == 0:
                            path.head = 0
                    counts = {}
                    print(x)
                    # path.print()
            i += 1
        # print(f"count: {count}")
        print(f"len(path.nodes): {len(path.nodes)}")
        path.print()
        print()
        x = copy.deepcopy(tmp)
        count += 1

def x28():
    x = [1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1]
    path = graph()

    count = 0
    while count < 5:
        counts = {}
        i = 0
        counting_budget = len(x)
        print(f"count: {count}")
        if path.head > -1:
            current_item_streak = path.nodes[path.head].streak_count
        current_count = 0
        current_streak_removed_from_counting_budget = False
        current_streak_is_too_long = False
        while i < len(x):
            number = x[i]
            print(f"i: {i}, path.head: {path.head}, number: {number}")
            if path.head > -1:
                if current_streak_removed_from_counting_budget:
                    current_streak_removed_from_counting_budget = False
                    print("here")
                    current_count = 0
                    if counting_budget > 0:
                        if number != path.nodes[path.head].number:
                            print(f"new number: {number}")
                            path.nextNode()
                else:
                    current_count += 1
                    if number != path.nodes[path.head].number:
                        print(f"streak goes too far, {path.head}, current_count: {current_count}")
                        current_streak_is_too_long = True
                    if current_count == current_item_streak:
                        counting_budget -= current_count
                        if current_streak_is_too_long:
                            current_streak_is_too_long = False
                            path.nodes[path.head].streak_count -= 1
                        print(f"found match with number: {path.nodes[path.head].number}")
                        print(f"current number: {number}, counting_budget: {counting_budget}")
                        current_streak_removed_from_counting_budget = True
                        # if counting_budget > 0:
                        #     if number != path.nodes[path.head].number:
                        #         print(f"new number: {number}")
                        # path.nextNode()
                        # counts = {}
                        # while i < len(x) and x[i] == number:
                        #     i += 1
                        # if path.head == -1:
                        #     continue
                        # print(f"counts: {counts}")
                        # sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)
                        # if len(sorted_counts) > 1:
                        #     second_largest_count = sorted_counts[1][1]
                        #     print(f"second_largest_count: {second_largest_count}")
                        #     if second_largest_count > 0:
                        #         if second_largest_count < counting_budget:
                        #             path.appendNode(node(sorted_counts[1][0], second_largest_count))
                # print(f"sorted_counts: {sorted_counts}")
            updateCounts2(counts, number)
            print(f"counts: {counts}")

            i += 1
        if path.head == -1:
            highest_count = max(counts.values())
            highest_count_numbers = {num: cnt for num, cnt in counts.items() if cnt == highest_count}
            highest_count_number = max(highest_count_numbers, key=highest_count_numbers.get)
            path.appendNode(node(highest_count_number, counts[highest_count_number]))
        path.head = 0
        
        # print(f"count: {count}")
        # print(f"len(path.nodes): {len(path.nodes)}")
        # print(f"counts: {counts}")
        path.print()
        print()
        # x = copy.deepcopy(tmp)
        count += 1

def updateMaxHeap(max_heap, number):
    max_heap_item = max_heap.extract_max()
    if max_heap_item is None:
        max_heap.insert({"number": number, "growth": 1})
    elif max_heap_item["number"] == number:
        max_heap.decrementItems()
        max_heap.insert({"number": number, "growth": max_heap_item["growth"] + 1})
    else:
        item = max_heap.findItem(number)
        max_heap.insert({"number": max_heap_item["number"], "growth": max_heap_item["growth"]})
        if item is None:
            max_heap.insert({"number": number, "growth": 2})
        else:
            max_heap.update(number, item["growth"] + 2)
        max_heap.decrementItems()

def x29():
    x = [1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1]
    path = graph()

    count = 0
    while count < 5:
        i = 0
        # print(f"count: {count}")
        max_heap = MaxHeap()
        while i < len(x):
            number = x[i]
            updateMaxHeap(max_heap, number)
            print(f"i: {i}, number: {number}")
            print(f"max_heap: {max_heap.heap}, max_heap.max_length: {max_heap.max_length}")
            path.print()
            max_heap_item = max_heap.extract_max()
            if path.head > -1:
                if max_heap_item is not None:
                    if max_heap_item["number"] == path.nodes[path.head].number:
                        if max_heap_item["streak"] == path.nodes[path.head].streak_count:
                            path.nodes[path.head].current_streak_is_too_long = max_heap.max_length > 1
                            if path.nodes[path.head].current_streak_is_too_long:
                                path.nodes[path.head].decreaseStreakCount()
                            second_largest_heap_item = max_heap.extract_max()
                            if second_largest_heap_item is not None:
                                if path.head + 1 >= len(path.nodes):
                                    print(f"here {max_heap.max_length}, max_heap.max_length > 2: {max_heap.max_length > 2}")
                                    path.appendNode(node(second_largest_heap_item["number"], second_largest_heap_item["streak"], max_heap.max_length > 2))
                                    path.nextNode()
                                else:
                                    if second_largest_heap_item["number"] == path.nodes[path.head + 1].number:
                                        path.nodes[path.head + 1].streak_count += 1
                                        path.nextNode()
                                max_heap.insert(second_largest_heap_item)
            max_heap.insert(max_heap_item)
            # print()
            print(f"max_heap: {max_heap.heap}, max_heap.max_length: {max_heap.max_length}")
            path.print()

            i += 1
        if len(path.nodes) == 0:
            max_heap_item = max_heap.extract_max()
            if max_heap_item is not None:
                path.appendNode(node(max_heap_item["number"], max_heap_item["streak"], max_heap.max_length == 1))
                path.head = 0
            max_heap.insert(max_heap_item)
        print()
        count += 1


def doesMaxHeapItemMatchRecord(max_heap_item, record):
    if max_heap_item["number"] == record["number"]:
        if max_heap_item["growth"] == record["growth"]:
            return True
    return False

def x30():
    x = [1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1]
    items = []
    items2 = {}
    count = 0
    while count < 7:
        i = 0
        # print(f"count: {count}")
        max_heap = MaxHeap()
        while i < len(x):
            number = x[i]
            updateMaxHeap(max_heap, number)
            print(f"i: {i}, number: {number}")
            print(f"max_heap: {max_heap.heap}, max_heap.max_length: {max_heap.max_length}")
            # print(f"items: {items}")
            if len(items) > 0:
                max_heap_item = max_heap.extract_max()
                if doesMaxHeapItemMatchRecord(max_heap_item, items[0]):
                    if len(max_heap.heap) == 0:
                        if not items[0]["streak_status"]:
                            items[0]["streak_status"] = max_heap.max_length == 1
                            if not items[0]["streak_status"]:
                                items[0]["growth"] -= 1
                max_heap.insert(max_heap_item)

            i += 1
        if len(items) == 0:
            max_heap_item = max_heap.extract_max()
            if max_heap_item is not None:
                items.append({"number": max_heap_item["number"], "growth": max_heap_item["growth"], "streak_status": max_heap.max_length == 1})
            max_heap.insert(max_heap_item)
        print(f"items: {items}")
        print()
        count += 1

def x31():
    x = [[1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1]]

    count = 0
    print(f"x: {x}")
    print()
    while count < 6:
        i = 0
        while i < len(x):
            partition = x[i]
            numbers = {num: True for num in partition}
            if len(numbers) > 1:
                if len(partition) > 1:
                    x = x[:i] + [partition[:len(partition) // 2]] + [partition[len(partition) // 2:]] + x[i+1:]
                    i += 1
            elif i + 1 < len(x):
                numbers2 = {num: True for num in x[i+1]}
                if len(numbers2) == 1 and len(numbers) == 1:
                    if list(numbers.keys())[0] == list(numbers2.keys())[0]:
                        x = x[:i] + [partition + x[i+1]] + x[i+2:]
                        i -= 1
            i += 1
        max_heap_list = []
        for k, partition in enumerate(x):
            max_heap_list.append(MaxHeap())
            for number in partition:
                updateMaxHeap(max_heap_list[k], number)
        print(f"x: {x}")
        for heap in max_heap_list:
            print(heap.heap[0])
        print()
        count += 1
