# from graphics import *
from collections import defaultdict
import Point1 as p
import XYPoint as xyp
import Grid as g


class Tracker():
    def __init__(self):
        self.prev = None
        self.current = None

class Window():
    def __init__(self):
        self.frequency_table = defaultdict(int)
        self.points = []

    def add(self, point):
        self.frequency_table[point.id] += 1
        self.points.append(point)
    
    def keepAdding(self):
        different_numbers_count = len(set(list(self.frequency_table.values())))
        if different_numbers_count > 1:
            return False
        return True
    
    def connectPoints(self, last_position):
        connect_window = self.points[:last_position]
        for i, point in enumerate(connect_window[:-1]):
            current_point = point
            next_point = connect_window[i+1]
            current_point.next = next_point
            next_point.prev = current_point

    def emptySection(self, last_position):
        self.points = self.points[:last_position]
        self.frequency_table = defaultdict(int)
        self.frequency_table[self.points[0]] += 1

    def getPoints(self, last_position):
        return self.points[:last_position]

class Unit():
    def __init__(self, sequences=None):
        self.id = 0
        self.levels = {0: {}}
        self.active_line_id = 0
        self.tracker_points = Tracker()
        self.tracker_points2 = []
        self.current_tracker = None
        self.sequences = sequences
        self.section_name = ""
        self.f = None
        self.top_left_front_xy_point = xyp.XYPoint()
        self.bottom_right_back_xy_point = xyp.XYPoint()


    def __str__(self):
        return f"(lines: {self.lines})"

    def addLine(self, number):
        new_line = g.Grid(number, len(self.lines), self)
        self.lines[new_line.id] = new_line
    
    def addParent(self, current_level, children_points):
        parent_id = len(children_points)
        next_level = current_level+1
        if next_level not in self.levels:
            self.levels[current_level+1] = {parent_id: g.Grid()}
        else:
            self.levels[current_level+1][parent_id] = g.Grid()
        self.levels[current_level+1][parent_id].addPoint(p.Point1(parent_id))
        self.levels[current_level+1][parent_id].getPoint().children = [children_points]

    def addLateralConnections(self, tracker_1, tracker_2):
        tracker_1.prev.lateral.append(tracker_2)
        tracker_2.lateral = [tracker_1.prev]
        tracker_1.prev.next = None
        tracker_1.line.points.pop()

    def backupTrackers(self, tracker_1, tracker_2):
        tracker_1.line.points.pop()
        tracker_1.line.points.pop()
        tracker_1 = tracker_1.prev
        tracker_2 = tracker_2.prev

    def makeLateralConnections(self, tracker_1, tracker_2):
        if tracker_1 is None and tracker_2 is None:
            return
        if tracker_1.prev is None or tracker_2.prev is None:
            return
        if tracker_1.prev.line.id == tracker_1.line.id and tracker_2.prev.line.id != tracker_2.line.id:
            self.addLateralConnections(tracker_1, tracker_2)
        elif tracker_1.prev.line.id != tracker_1.line.id and tracker_2.prev.line.id == tracker_2.line.id:
            self.addLateralConnections(tracker_2, tracker_1)
        elif tracker_1.line.id == tracker_2.line.id:
            self.backupTrackers(tracker_1, tracker_2)

    def counterTest(self):
        # make path through the input using the counter and the order id for cycles
        # make array of count values
        pass

    '''
    for tracker_points in self.tracker_points2:
        print(f"tracker_points: prev {None if tracker_points.prev is None else id(tracker_points.prev)}, current {None if tracker_points.current is None else id(tracker_points.current)}")
        tracker_points.prev = tracker_points.current
    '''

    def processInput(self, input):

        cut_message = False
        levels = [Window()]
        for i, item in enumerate(input):
            j = 0
            while j < len(levels):
                if item not in self.levels[j]:
                    self.levels[j][item] = g.Grid()
                # self.levels[j][item].addPoint(p.Point1(item))
                levels[j].add(self.levels[j][item].getPoint())
                if not levels[j].keepAdding():
                    cut_message = True
                    print(f"window: {[i.id for i in levels[j].points[:-1]]}")
                    levels[j].connectPoints(-1)
                    self.addParent(j, levels[j].getPoints(-1))
                    for point in levels[j].points[:-1]:
                        print(point)
                    # print(f"window: {[i.id for i in levels[j].points[:-1]]}")

                j += 1
        else:
            if not cut_message:
                print(f"window: {[i.id for i in levels[0].points]}")

    def resetGrids(self):
        self.grids = {}     

    def processPoints3(self, current_number):
        if current_number not in self.lines:
            self.addLine(current_number)
        
        print(f"current_number: {current_number}")

        self.lines[current_number].processMatch()
        self.printLines()
        print()

    def printLines(self):
        for line_id in self.lines:
            print(f"{self.lines[line_id].order_id}: {line_id}")
            self.lines[line_id].printLine()
            print("----------")

class F():
    def __init__(self, sequences):
        self.unit = Unit(sequences)

    # def readLine(self):
    #     for i, number in enumerate(self.level.sequence):
    #         self.level.processPoint1s(i, number)

    def readLine2(self):
        self.unit.tracker_points2 = [None] * len(self.unit.sequences[0])
        for i, numbers in enumerate(self.level.sequences):
            self.unit.processPoints2(i, numbers)

    def readLines3(self):
        for number in self.unit.sequences[0]:
            self.unit.processPoints3(number)

    def printLines(self):
        for line_id in self.lines:
            print(f"{line_id} child_sequence_length: {self.lines[line_id].child_sequence_length}")
            self.lines[line_id].printLine()

def x25():
    # [1, 2, 2, 1, 3, 3]
    # [1, 2, 1, 2, 1, 1]
    # [1, 2, 1, 2, 1, 1, 2, 3, 1, 2, 3]
    # [1, 2, 3, 1, 2, 3, 1, 4, 5]
    # [1, 2, 1, 2, 1, 3, 1, 3]
    # [1, 1, 1, 1, 1]
    # 2, 1, 3
    # 1, 2, 3, 4, 1, 3, 2, 4, 4, 2, 1, 3, 3, 1, 4, 2, 2, 1, 3  1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 3, 4    2, 1, 2, 1
    # f = F(ReadHead([{"parent_line_id":i, "children": []} for i in [1, 1, 1]]))
    # f = F([[i] for i in [1, 2, 1, 2, 3, 1, 2, 5]])
    # f = F([[1, 100], [2, 100], [1, -100], [3, 300]])
    f = F([[1, 2]])
    f.readLines3()
    # f = F([[i] for i in [1, 2, 1, 2, 3, 1, 2, 5]])

    # f = F(ReadHead([{"parent_line_id":i, "children": []} for i in [1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 3, 4]]))
    # f = F(ReadHead([{"parent_line_id":i, "children": []} for i in [1, 1, 1, 2, 2, 1, 1, 2, 2, 2, 3, 3]]))
    # f = F(ReadHead([{"parent_line_id":i, "children": []} for i in [1, 2, 1, 2, 3]]))
    # f = F(ReadHead([{"parent_line_id":i, "children": []} for i in [12, 12, 3]]))
    # f = F(ReadHead([{"parent_line_id":i, "children": []} for i in [12, 3]]))
    # f = F(ReadHead([{"parent_line_id":i, "children": []} for i in [1, 2, 3, 4, 2, 3, 5]]))
    # f = F(ReadHead([{"parent_line_id":i, "children": []} for i in [1, 2, 3, 4, 5, 3, 4, 3]]))
    # f = F(ReadHead([{"parent_line_id":i, "children": []} for i in [1, 2, 34, 5, 34, 3]]))
    # f = F(ReadHead([{"parent_line_id":i, "children": []} for i in [12, 34, 5, 34, 3]]))

    # 12345343
    # f = F(ReadHead([{"parent_line_id":i, "children": []} for i in [1, 2, 3, 4, 1, 3, 2, 4, 4, 2, 1, 3, 3, 1, 4, 2, 2, 1, 3, 3, 2, 1, 2, 4]]))
    # 1, 2, 3, 4, 1, 3, 2, 4, 4, 2, 1, 3, 3, 1, 4, 2, 2, 1, 3
    # f = F(ReadHead([{"parent_line_id":i, "children": []} for i in [1, 2, 3, 4, 1, 3, 2, 4, 4, 2, 1, 3, 3, 1, 4, 2, 2, 1, 3, 3, 2, 1, 2, 4]]))
    # f = F(ReadHead([{"parent_line_id":i, "children": []} for i in [1, 2, 3, 4, 1, 3, 2, 4, 2, 3, 4, 4, 3, 2, 4, 2, 1, 3, 3, 1, 4, 2, 2, 1, 3, 3, 2, 1, 2, 4, 2, 1, 4]]))

    # f = F(ReadHead([{"parent_line_id":i, "children": []} for i in [1, 2, 3, 4, 1, 3, 2, 4, 4, 2, 1, 3, 3, 1, 4, 2, 2, 1, 3, 3, 2, 1, 4, 2, 10, 20, 30, 40, 10, 30, 20, 40, 40, 20, 10, 30, 30, 10, 40, 20, 20, 10, 30, 30, 20, 10, 20, 40]]))
    # f = F(ReadHead([{"parent_line_id":i, "children": []} for i in [10, 20, 30, 40, 10, 30, 20, 40, 40, 20, 10, 30, 30, 10, 40, 20, 20, 10, 30, 30, 20, 10, 20, 40]]))

    # f = F(ReadHead([{"parent_line_id":i, "children": []} for i in [1, 2, 3, 4, 1, 3, 2, 4, 2, 3, 4, 4, 3, 2, 4, 2, 1, 3, 3, 1, 4, 2, 2, 1, 3, 3, 2, 1, 2, 4, 2, 1, 4, 1, 2, 3, 4, 1, 3, 2, 4, 2, 3, 4, 4, 3, 2, 4, 2, 1, 3, 3, 1, 4, 2, 2, 1, 3, 3, 2, 1, 2, 4, 2, 1, 4]]))
    # f = F(ReadHead([{"parent_line_id":i, "children": []} for i in [1, 2, 3, 4, 1, 3, 2, 4, 2, 3, 4, 4, 3, 2, 4, 2, 1, 3, 3, 1, 4, 2, 2, 1, 3, 3, 2, 1, 2, 4, 2, 1, 4, 10, 20, 30, 40, 10, 30, 20, 40, 20, 30, 40, 40, 30, 20, 40, 20, 10, 30, 30, 10, 40, 20, 20, 10, 30, 30, 20, 10, 20, 40, 20, 10, 40]]))

    # level = Level([1, 2, 3, 4, 2])
    # lines = Lines()
    # read_head = ReadHead([1, 2, 3, 4, 2], lines)
    # lines.read_head_ref = read_head
    # modulus_clock = ModulusClock()

    # f.level.tracker_Point1s.prev = None
    # f.level.tracker_Point1s.current = None
    # f.level.alphabet = {}
    # f.level.have_new_Point1s = {}
    # f.level.read_head = ReadHead([{"parent_line_id":i, "children": []} for i in [2, 1, 2]])
    # f.readLine()
    # f.readLine2()
    # lines.printLines()
    # print()
    # for line_id in lines.lines:
    #     print(f"line_id: {line_id}, line: {lines.lines[line_id]}")
    #     tracker = lines.lines[line_id].start_Point1
    #     tracker = lines.lines[line_id].start_point
    #     while tracker != None:
    #         print(f"tracker: {tracker}\n")
    #         tracker = tracker.top
    

def x26():


    unit = Unit()

    print("test 1")
    unit.processInput([1, 2, 3])
    unit.resetGrids()
    print()

    print("test 2")
    unit.processInput([1, 2, 3, 1])
    unit.resetGrids()
    print()

    print("test 3")
    unit.processInput([1, 2, 3, 2])
    unit.resetGrids()
    print()

    print("test 4")
    unit.processInput([1, 2, 3, 3])
    unit.resetGrids()
    print()

    print("test 5")
    unit.processInput([1, 1, 1, 1])
    unit.resetGrids()

    print()
    print("test 6")
    unit.processInput([1, 1, 1, 1, 2])
    unit.resetGrids()

    print()
    print("test 7")
    unit.processInput([1, 1, 1, 1, 2, 2])  


class Clock():
    def __init__(self):
        self.current_number = -1
        self.value = 0
        self.prev_value = 0
        self.streak_broken = False
        self.part_of_sequence_repeats = False
        self.prev_changes_count = 0
        self.changes_count = 0

    def update(self, number):
        if self.current_number == -1:
            self.current_number = number

        if self.current_number == number:
            self.value += 1
            self.prev_value = self.value
        elif self.current_number != number:
            self.prev_value = self.value
            self.value = 1
            self.changes_count += 1

    def getValue(self):
        return self.value

    def getPrevValue(self):
        return self.prev_value
    
    def getInterruptionStatus(self):
        if self.streak_broken:
            return f"streak broken, changes_count: {self.prev_changes_count}"
        elif self.part_of_sequence_repeats:
            return f"part of sequence repeats, changes_count: {self.prev_changes_count}"

    def valuesMatch(self, current_value):
        if self.prev_value == current_value:
            self.streak_broken = False
            self.part_of_sequence_repeats = False
        elif self.prev_value > current_value:
            self.streak_broken = True
            self.part_of_sequence_repeats = False
            self.prev_changes_count = self.changes_count
            self.changes_count = 0
        elif self.prev_value < current_value:
            self.streak_broken = False
            self.part_of_sequence_repeats = True
            self.prev_changes_count = self.changes_count
            self.changes_count = 0
        return self.prev_value == current_value

class Plane():
    def __init__(self):
        self.lines = {}
    
    def addLine(self, kind):
        if kind not in self.lines:
            self.lines[kind] = []
        return len(self.lines[kind])

    def addNumber(self, kind, number):
        self.lines[kind].append(number)

    def __str__(self):
        return self.lines


def x27(input):
    clock = Clock()
    items = {i: [] for i in input}
    for i, number in enumerate(input):
        clock.update(number)
        items[number].append(i)
        print(f"number: {number}, clock: {clock.getPrevValue()}")
        if not clock.valuesMatch(len(items[number])):
            print(f"i: {i}, count: {len(items[number])}, clock prev_increment: {clock.getPrevValue()}, interruption status: {clock.getInterruptionStatus()}")
        print(f"items: {items}")
    print()

def x28(input):
    print(input)
    clock = Clock()
    items = defaultdict(Plane)
    for i, number in enumerate(input):
        clock.update(number)
        clock_number = clock.value
        items[number].addLine("input")
        items[clock_number].addLine("clock")
        items[number].addNumber("input", i)
        items[clock_number].addNumber("clock", i)
        print(f"number: {number}, clock: {clock.getPrevValue()}")
        if not clock.valuesMatch(len(items[number].lines["input"])):
            print(f"i: {i}, count: {len(items[number].lines["input"])}, clock prev_increment: {clock.getPrevValue()}, interruption status: {clock.getInterruptionStatus()}")
        print(f"items")
        for item in items:
            print(f"item: {item}, plane: {items[item].lines}")
        print()
    print()

def x29(input):
    clock = Clock()
    levels = [defaultdict(Plane)]
    input_list = [input]
    last_input = [1]
    i = 0
    while i < len(input_list):
        input = input_list[i]
        counter = 0
        prev_counter = 0
        next_input = []
        print(f"i: {i}, input: {input}")
        j = 0
        while j < len(input):
            number = input[j]
            clock.update(number)
            clock_number = clock.value

            level = levels[i]
            level[number].addLine("input")
            level[clock_number].addLine("clock")
            level[number].addNumber("input", j)
            level[clock_number].addNumber("clock", j)
            print(f"number: {number}, clock: {clock.getPrevValue()}")
            if not clock.valuesMatch(len(level[number].lines["input"])):
                print(f"j: {j}, count: {len(level[number].lines["input"])}, sequence length: {counter}")
                next_input.append(counter)
                prev_counter = counter
                counter = -1
            counter += 1
            j += 1
        if counter > 0:
            next_input.append(counter)
        print(f"levels")
        for i, level in enumerate(levels):
            print(f"i: {i}, items")
            for item in level:
                print(f"item: {item}, plane: {level[item].lines}")
            print()
        print()
        print(i)
        print("before 1")
        print(input_list, prev_counter)

        input_list[i] = input_list[i][prev_counter:]
        print("after 1 before 2")
        print(input_list)

        i += 1
        # print(next_input)

        if len(next_input) > 0:
            if i == len(input_list):
                # print(next_input, last_input)
                # print((len(next_input) == len(last_input) and next_input[0] == last_input[0]))
                if not (len(next_input) == len(last_input) and next_input[0] == last_input[0]):
                    last_input = next_input
                    input_list.append(next_input)
                    levels.append(defaultdict(Plane))
        print("after 2")
        print(input_list)
        # print(i)
    print()

def x30(input):
    clock = Clock()
    levels = [defaultdict(Plane)]
    input_list = [input]
    i = 0
    while i < len(input_list):
        input = input_list[i]
        counter = 0
        prev_counter = 0
        next_input = []
        print(f"i: {i}, input: {input}")
        j = 0
        while j < len(input):
            number = input[j]
            clock.update(number)
            clock_number = clock.value

            level = levels[i]
            level[number].addLine("input")
            level[clock_number].addLine("clock")
            level[number].addNumber("input", j)
            level[clock_number].addNumber("clock", j)
            print(f"number: {number}, clock: {clock.getPrevValue()}")
            if not clock.valuesMatch(len(level[number].lines["input"])):
                print(f"j: {j}, count: {len(level[number].lines["input"])}, sequence length: {counter}")
                if counter > 0:
                    next_input.append(counter)
                    prev_counter = counter
                    counter = -1
                    input_list[i] = input_list[i][prev_counter:]
            counter += 1
            j += 1
        print(f"levels")
        for k, level in enumerate(levels):
            print(f"k: {k}, items")
            for item in level:
                print(f"item: {item}, plane: {level[item].lines}")
            print()
        print()
        print(i, input_list, prev_counter, counter)
        if prev_counter > 0:
            input_list[i] = input_list[i][prev_counter:]
            input_list.append(next_input)
            levels.append(defaultdict(Plane))
        if prev_counter == 0:
            if len(input_list[i]) > 0:
                input_list = input_list[:i]
            i = -1
        print(input_list)
        # print(i)
        # print("before 1")
        # print(input_list, prev_counter)

        # input_list[i] = input_list[i][prev_counter:]
        # print("after 1 before 2")
        # print(input_list)

        i += 1
        # print(next_input)

        # if len(next_input) > 0:
        #     if i == len(input_list):
        #         print(next_input)
                # if not (len(next_input) == 1 and next_input[0] == 0):
                    # print("here")
                    # print(next_input, last_input)
                    # print((len(next_input) == len(last_input) and next_input[0] == last_input[0]))
                    # if not (len(next_input) == len(last_input) and next_input[0] == last_input[0]):
                    # last_input = next_input
                # input_list.append(next_input)
                # levels.append(defaultdict(Plane))
                    # i = 0
        # print("after 2")
        # print(input_list)
        # print(i)
    print()

def x31(input):
    print(input)
    lines = {i: [] for i in input}
    prev_line = input[0]
    current_line = input[0]
    lines[current_line].append(0)
    sequence_length = 1
    remaining_input = input[1:]
    for i, number in enumerate(remaining_input):
        adjusted_i = i+1
        current_line = number
        lines[current_line].append(adjusted_i)
        print(f"i: {adjusted_i}, prev_line: {prev_line} ({len(lines[prev_line])}), current_line: {current_line} ({len(lines[current_line])})")

        if len(lines[prev_line]) < len(lines[current_line]):
            print("part of sequence repeats")
            print(f"sequnce_length: {sequence_length}")
            print(lines)
            lines = {i: [] for i in input}
            lines[current_line].append(adjusted_i)
            sequence_length = 0
        elif len(lines[prev_line]) > len(lines[current_line]):
            print("streak break")
            print(f"sequnce_length: {sequence_length}")
            print(lines)
            lines = {i: [] for i in input}
            lines[current_line].append(adjusted_i)
            sequence_length = 0
        if i < len(input)-1:
            if current_line != input[i+1]:
                prev_line = current_line
        sequence_length += 1
        print(lines)
        print()
    print()

class Plane2():
    def __init__(self):
        self.lines = []

    def addPoint(self, point):
        self.lines.append(point)

    def __str__(self):
        return ", ".join([f"{item}" for item in self.lines])

class Point2():
    def __init__(self):
        self.next = None
        self.id = -1
    def  __str__(self):
        next = "None" if not self.next else self.next.id
        return f"id: {self.id}, next: {next}"

def makeDictLinkedList(input):
    lines = defaultdict(Plane2)
    prev_point = None
    for i, number in enumerate(input):
        point = Point2()
        point.id = i
        if prev_point:
            prev_point.next = point
        lines[number].addPoint(point)
        prev_point = point
    return lines

def x32(input):
    print(input)
    input_list = makeDictLinkedList(input)
    for key in input_list:
        print(f"{key}: {input_list[key]}")
    print()
    '''
    '''
    return
    lines = {i: [] for i in input}
    prev_line = input[0]
    current_line = input[0]
    lines[current_line].append(0)
    sequence_length = 1
    remaining_input = input[1:]
    for i, number in enumerate(remaining_input):
        adjusted_i = i+1
        current_line = number
        lines[current_line].append(adjusted_i)
        print(f"i: {adjusted_i}, prev_line: {prev_line} ({len(lines[prev_line])}), current_line: {current_line} ({len(lines[current_line])})")

        if len(lines[prev_line]) < len(lines[current_line]):
            print("part of sequence repeats")
            print(f"sequnce_length: {sequence_length}")
            print(lines)
            lines = {i: [] for i in input}
            lines[current_line].append(adjusted_i)
            sequence_length = 0
        elif len(lines[prev_line]) > len(lines[current_line]):
            print("streak break")
            print(f"sequnce_length: {sequence_length}")
            print(lines)
            lines = {i: [] for i in input}
            lines[current_line].append(adjusted_i)
            sequence_length = 0
        if i < len(input)-1:
            if current_line != input[i+1]:
                prev_line = current_line
        sequence_length += 1
        print(lines)
        print()
    print()

# x25()
# # x26()
# x27([5, 7, 4, 7])
# x27([1, 1, 1, 2])
# x27([3, 3, 1, 2, 1])

# x28([5, 7, 4, 7])
# x28([1, 1, 1, 2])
# x28([3, 3, 1, 2, 1])


# x29([5, 7, 4, 7])
# x29([1, 1, 1, 2])
# x29([3, 3, 1, 2, 1])

# x30([5, 7, 4, 7])
# x30([5, 7, 4, 7, 4, 4])

# x30([1, 1, 1, 2])
# x30([3, 3, 1, 2, 1])

# x31([5, 7, 4, 7])
# x31([5, 7, 4, 7, 4, 4])
# x31([1, 1, 1, 2])
# x31([3, 3, 1, 2, 1])

# makeDictLinkedList([5])
# makeDictLinkedList([5, 7])
# x32([5, 7, 4, 7])

class Node():
    def __init__(self):
        self.number = 1
        self.filter_threshold = 0.9
        self.next = None
        self.parent_list = []
        self.children_list = []

    def __str__(self):
        return f"{self.number}"

    def process(self, test_number):
        print(test_number)
        result = abs(self.number - test_number)
        # print(self.number, test_number, percentage)
        # if self.parent:
        #     print(self.parent.children_locked)
        return result <= self.filter_threshold
        '''
        if percentage <= 0.1:
            if self.next:
                print("revisit")
                self.parent.children_locked = True
                self.revisit_lateral = True
            self.add_lateral = True
        elif percentage > 0.1:
            if self.parent:
                if self.parent.children_locked:
                    self.stop_revisit = True
            else:
                if self.parent is None:
                    self.parent = Node()
                    self.parent.children = [self]
                else:
                    self.parent.children.append(self)
                if self.next is None:
                    self.next = Node(number=test_number)
                    self.next.parent = self.parent
                    self.parent.children.append(self.next)
                self.add_next = True
        '''

class Level():
    def __init__(self):
        self.root = Node()
        self.tracker = None
        self.count = 0
        self.new_number_added = False

    def start(self, number):
        is_match = self.root.process(test_number=number)
        if is_match:
            self.tracker = self.root
        else:
            new_node = Node()
            self.root = new_node
            self.tracker = self.root
            print(f"new number added")

    def add(self, number):
        if self.count == 0:
            self.start(number)
            self.count += 1
        elif self.count == 1:
            is_match = self.tracker.process(test_number=number)
            if is_match:
                pass
            else:
                if self.tracker.next is None:
                    self.tracker.next = Node()
                    print(f"new number added")
                    self.count += 1
                else:
                    print("skipped")
                    self.tracker = None
                    self.count = 0
        elif self.count == 2:
            is_match = self.tracker.process(test_number=number)
            if is_match:
                pass
            else:
                self.tracker = None
                self.start(number)
                self.count = 1

        print()

    def process(self):

        input = [1, 1.1, 1.3]
        for i, item in enumerate(input):
            print(f"i: {i}, item: {item}")
            # print(f"i before: {i}")
            self.add(item)
            # print(f"i after: {i}")
            # print(f"{[str(node) for node in self.root]}")
            # print(f"start_node: {self.start_node}")

        print(f"{str(self.root)}")
        print()            
        print("lists")
        # for item in self.root:
        tracker2 = self.root
        print(tracker2)
        # print("^^^")
        j = 0
        while tracker2:
            print(f"j: {j}")
            print("---")
            print(1)
            tracker2 = tracker2.next
            print("---")
            j += 1
        # print("^^^")

        print()


        # print("input list 2")
        # input2 = [12.1111111, 12.222222, 28, 3]
        # input_list2 = [Node(item) for item in input2]

        # for i, item in enumerate(input_list2):
        #     print(f"i: {i}, item: {item.numbers[0]}")
        #     # print(f"i before: {i}")
        #     self.add(item)
        # print(f"{[str(node) for node in self.root]}")
        # print()            
        # print("lists")
        # for item in self.root:
        #     tracker2 = item
        #     print(tracker2)
        #     # print("^^^")
        #     j = 0
        #     while tracker2:
        #         print(f"j: {j}")
        #         print("---")
        #         for number in tracker2.numbers:
        #             print(number)
        #         tracker2 = tracker2.next
        #         print("---")
        #         j += 1
        #     # print("^^^")

        #     print()

x = Level()
x.process()

def test():
    win = GraphWin()
    win.setCoords(0,0,10,10)
    t = Text(Point(5,5), "Centered Text")
    t.draw(win)
    p = Polygon(Point(1,1), Point(5,3), Point(2,7))
    p.draw(win)
    e = Entry(Point(5,6), 10)
    e.draw(win)
    win.getMouse()
    # color_rgb(10, 10, 10)
    p.setFill("red")
    p.setOutline("blue")
    p.setWidth(2)
    s = ""
    for pt in p.getPoints():
        s = s + "(%0.1f,%0.1f) " % (pt.getX(), pt.getY())
    t.setText(e.getText())
    e.setFill("green")
    e.setText("Spam!")
    e.move(2,0)
    win.getMouse()
    p.move(2,3)
    s = ""
    for pt in p.getPoints():
        s = s + "(%0.1f,%0.1f) " % (pt.getX(), pt.getY())
    t.setText(s)
    win.getMouse()
    p.undraw()
    e.undraw()
    t.setStyle("bold")
    win.getMouse()
    t.setStyle("normal")
    win.getMouse()
    t.setStyle("italic")
    win.getMouse()
    t.setStyle("bold italic")
    win.getMouse()
    t.setSize(14)
    win.getMouse()
    t.setFace("arial")
    t.setSize(20)
    win.getMouse()
    win.close()

# test()

# def center_window(window):
#     window.update_idletasks()
#     width = window.winfo_width()
#     height = window.winfo_height()
#     print(width, height)
#     screen_width = window.winfo_screenwidth()
#     screen_height = window.winfo_screenheight()
#     print(screen_width, screen_height)
#     x = (screen_width - width) // 2
#     y = (screen_height - height) // 2
#     window.geometry(f"{width+500}x{height+200}+{x-200}+{y}")

# # Example usage:
# root = Tk()
# root.title("Centered Window")
# center_window(root)
# root.mainloop()