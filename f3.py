from graphics import *

class Point1():

    def __init__(self, next=None, parent=None, children=None, line=None):
        self.next = next
        self.parent = parent
        self.lateral = None
        if children is None:
            children = []
        self.children = children
        self.line = line

    def __str__(self):
        next = None if self.next is None else id(self.next)
        lateral = None if self.lateral is None else id(self.lateral)
        return f"(Point1 id: {id(self)}, next: {next}, lateral: {lateral} parent: {self.parent}, line id: {self.line.id})"

    def printPoint(self):
        print(f"{self}")
        # if self.next is not None:
        #     next = self.next
        #     while next.line == self.line:
        #         print(f"{next}")
        #         next = next.next
        children = [] if self.children is None else [id(child) for child in self.children if child is not None]
        if len(children) > 0:
            print(f"    children:")
            for child in children:
                print(f"        {child}")
class Line():
    def __init__(self, id, order_id, level):
        self.id = id
        self.order_id = order_id
        self.points = []

class Point():

    def __init__(self, top=None, bottom=None, prev=None, next=None, parent=None, children=[], line_ref=None, order_id=0, is_expected=False, expected_sequence_length=0):
        self.top = top
        self.bottom = bottom
        self.prev = prev
        self.next = next
        self.parent = parent
        self.children = children
        self.children_match_count = 0
        self.current_count = 0
        self.same_count_points = []
        self.point_expectation_status_transfered_from = None
        self.is_expected = is_expected
        self.expected_sequence_length = expected_sequence_length
        self.line_transition_kind = None
        self.line_ref = line_ref
        self.order_id = order_id
    def __str__(self):
        return f"(point id: {id(self)}, next: {self.next}, is_expected: {self.is_expected}, order_id: {self.order_id}, line id: {self.line_ref.id})"
    def getCount(self, level_id=0):
        if level_id == 0:
            if self.top is None and self.bottom is None:
                self.current_count = 1
            elif self.bottom is None and self.top is not None:
                current_count = self.top.getCount(level_id + 1) + 1
                self.sendCount(current_count, level_id + 1)
                self.current_count = current_count
            elif self.bottom is not None and self.top is None:
                current_count = self.bottom.getCount(level_id - 1) + 1
                self.sendCount(current_count, level_id - 1)
                self.current_count = current_count
            elif self.bottom is not None and self.top is not None:
                current_count = self.top.getCount(level_id + 1) + self.bottom.getCount(level_id - 1) + 1
                self.sendCount(current_count, level_id + 1)
                self.sendCount(current_count, level_id - 1)
                self.current_count = current_count
        if level_id > 0:
            return 1 if self.top is None else self.top.getCount(level_id + 1) + 1
        elif level_id < 0:
            return 1 if self.bottom is None else self.bottom.getCount(level_id - 1) + 1

    def sendCount(self, count, level_id=0):
        self.current_count = count
        if level_id > 0:
            if self.top is not None:
                self.top.sendCount(count, level_id + 1)
        elif level_id < 0:
            if self.bottom is not None:
                self.bottom.sendCount(count, level_id - 1)
    def matchCount(self, count):
        return self.current_count == count
    def findPointsOnOtherLinesWithSameCount(self, current_count, level_id=0):
        if level_id == 0:
            if self.next is None and self.prev is None:
                if self.matchCount(current_count):
                    self.same_count_points = [id(self)]
                else:
                    return []
            elif self.next is None and self.prev is not None:
                if self.matchCount(current_count):
                    same_count_points = [id(self)] + self.prev.findPointsOnOtherLinesWithSameCount(current_count, level_id + 1)
                    self.same_count_points = same_count_points
                    return same_count_points
                else:
                    return []
            elif self.next is not None and self.prev is None:
                if self.matchCount(current_count):
                    same_count_points = [id(self)] + self.next.findPointsOnOtherLinesWithSameCount(current_count, level_id - 1)
                    self.same_count_points = same_count_points
                    return same_count_points
                else:
                    return []
            elif self.next is not None and self.prev is not None:
                if self.matchCount(current_count):
                    same_count_points = [id(self)] + self.prev.findPointsOnOtherLinesWithSameCount(current_count, level_id + 1) + self.next.findPointsOnOtherLinesWithSameCount(current_count, level_id - 1)
                    self.same_count_points = same_count_points
                    return same_count_points
                else:
                    return []
        elif level_id > 0:
            same_count_points = []
            if self.matchCount(current_count):
                same_count_points = [id(self)]
            if self.prev is not None:
                return same_count_points + self.prev.findPointsOnOtherLinesWithSameCount(current_count, level_id + 1)
            else:
                return same_count_points
        elif level_id < 0:
            same_count_points = []
            if self.matchCount(current_count):
                 same_count_points = [id(self)]
            if self.next is not None:
                return same_count_points + self.next.findPointsOnOtherLinesWithSameCount(current_count, level_id - 1)
            if self.next is None:
                return same_count_points
    def isExpectedChild(self):
        if self.children_match_count < len(self.children):
            return False
        elif self.children_match_count == len(self.children):
            return True
    def isExpected(self, i=None):
        if self.is_expected:
            # if self.next is not None:
            return True
            # else:
            #     return self.parent.setExpectedChild()
        # elif self.order_id == i:
        #         pass
        else:  
            if self.top is not None:
                return self.top.isExpected()
            else:
                return False
    def removeExpectedPoints(self):
        if self.is_expected:
            self.is_expected = False
        else:  
            if self.top is not None:
                self.top.removeExpectedPoints()
    def removeNextExpectedPoints(self):
        if self.next is not None:
            if self.is_expected:
                self.is_expected = False
        else:  
            if self.top is not None:
                self.top.removeNextExpectedPoints()
    def setAllPointsToExpected(self):
        if self.next is not None:
            self.next.is_expected = True
        if self.bottom is not None:
            self.bottom.setExpected()
    def setNextPointToExpected(self):
        if self.next is not None:
            self.next.is_expected = True
            return
        if self.bottom is not None:
            self.bottom.setNextPointToExpected()
    def getNextExpectedPoint(self):
        if self.next is not None:
            if self.next.is_expected:
                return self.next
        if self.bottom is not None:
            return self.bottom.getNextExpectedPoint()
    def getCurrentPoint(self):
        if self.next is not None:
            if self.next.is_expected:
                return self
        if self.top is not None:
            return self.top.getCurrentPoint()
    def passExpectedToNextPoint(self):
        if self.is_expected:
            if self.next is not None:
                self.next.is_expected = True
            if self.top is not None:
                self.top.setExpected()
        else:
            if self.top is not None:
                self.top.passExpectedToNextPoint()
    def f(self, current_clock_length, modulus_clock):
        # print(f"point.f self: {self}, current_clock_length: {current_clock_length}, modulus_clock: {modulus_clock}")
        if self.next is not None:
            if current_clock_length > 0:
                remainder = self.next.order_id % current_clock_length
                if remainder > 0:
                    if remainder - 1 == modulus_clock:
                        return self.next
                elif self.next.order_id - 1 == modulus_clock:
                    return self.next
        if self.top is not None:
            self.top.f(current_clock_length, modulus_clock)
        else:
            return None

    def printPoint(self):
        next = None if self.next is None else id(self.next)
        prev = None if self.prev is None else id(self.prev)
        parent = None if self.parent is None else id(self.parent)
        print(f"    {id(self)}: next: {next}, prev: {prev}, parent: {parent}, line_transition_kind: {self.line_transition_kind}")
        children = [] if self.children is None else [id(child) for child in self.children if child is not None]
        if len(children) > 0:
            print(f"        children:")
            for child in children:
                print(f"            {child}")
        if self.top is not None:
            self.top.printPoint()

class Line2():
    def __init__(self, id, level):
        self.id = id
        self.groups = [[]]
        self.current_group = 0
        self.current_point = None
        self.level = level

    def addPoint(self, point):

        # print(f"adding point point: {id(point)}")
        point.point_position = len(self.points)
        self.points.append(point)
        self.current_point = point

    def removePoint(self, point_to_delete):
        points = [point for point in self.points if point != point_to_delete]
        if self.current_point == point_to_delete:
            if len(self.points) > 0:
                self.current_point = self.points[-1]
            else:
                self.current_point = None

    def findConnectedPoint(self, target_line):
        connected_points = [point for point in self.points if point.next is not None and point.next.line.id == target_line]        
        if len(connected_points) == 1:
            return connected_points[0]
        return None

    def printLine(self):
        for i, point in enumerate(self.points):
            point.printPoint()

class Tracker():
    def __init__(self):
        self.prev = None
        self.current = None

class Level():
    def __init__(self, sequences=None):
        self.id = 0
        self.lines = {}
        self.tracker_points = Tracker()
        self.tracker_points2 = []
        self.parent_id = -1
        self.sequences = sequences
        self.levels = None
        self.section_name = ""
        self.f = None

    def removePoint(self):
        self.groups[self.current_group].pop()
    def addGroup(self):
        self.current_group += 1
        self.groups.append([])

    def getTransitionKind(self, id_1, id_2):
        if id_1 == id_2:
            return "same"
        else:
            return "different"

    def connectPoints(self, prev_point):

        number = self.id
        print(f"prev_point: {prev_point}")
        if prev_point is None:
            prev_point = self.current_point
            return True
        elif prev_point is not None:
            if prev_point.line_transition_kind is None:
                line_transition_kind = self.getTransitionKind(prev_point.line_ref.id, self.current_point.line_ref.id)
                prev_point.line_transition_kind = line_transition_kind
                self.current_point.line_transition_kind = line_transition_kind
                prev_point.next = self.current_point
                self.current_point.prev = prev_point
                return True
            elif prev_point.line_transition_kind is not None:
                prev_point_line_transition_kind = prev_point.line_transition_kind
                new_point_line_transition_kind = self.getTransitionKind(prev_point.line_ref.id, self.current_point.line_ref.id)
                if prev_point_line_transition_kind == new_point_line_transition_kind:
                    if new_point_line_transition_kind == "different":
                        if self.level.alphabet[number] > 1:
                            print(f"structure sequence broken at line {number}: number repeated")
                            return False
                if prev_point_line_transition_kind != new_point_line_transition_kind:
                    print(f"structure sequence broken at line {number}")
                    return False
                else:
                    self.current_point.line_transition_kind = prev_point_line_transition_kind
                    prev_point.next = self.current_point
                    self.current_point.prev = prev_point
                    return True
    def printLine(self):

        for i, group in enumerate(self.groups):
            print(f"    {i}:")
            for point in group:

                next = None if point.next is None else id(point.next)
                prev = None if point.prev is None else id(point.prev)
                parent = None if point.parent is None else id(point.parent)
                print(f"    {id(point)}: next: {next}, prev: {prev}, parent: {parent}, line_transition_kind: {point.line_transition_kind}")
                children = [] if point.children is None else [id(child) for child in point.children if child is not None]
                if len(children) > 0:
                    print(f"        children:")
                    for child in children:
                        print(f"            {child}")


class ReadHead():
    def __init__(self, sequence=None, lines=[]):
        if sequence is None:
            sequence = []
        self.sequence = sequence
        self.i = 0
        self.current_number = 0
        self.current_children = []
        self.lines = lines
    def next(self, modulus_clock):
        if 0 > self.i or self.i >= len(self.sequence):
            return
        print(f"self.i: {self.i}")
        self.current_number = self.sequence[self.i]
        self.i += 1
        self.lines_ref.matchLine3(self.current_number, self.i, modulus_clock)

    def prev(self):
        if 0 > self.i or self.i >= len(self.sequence):
            return
        print(f"self.i: {self.i}")
        self.i -= 1
    def next2(self):
        # if 0 > self.i or self.i >= len(self.sequence):
        #     return
        print(f"self.i: {self.i}")
        # self.current_number = self.sequence[self.i]
        self.i += 1
    def setCurrentNumber(self):
        if 0 > self.i or self.i >= len(self.sequence):
            return
        self.current_number = self.sequence[self.i]["parent_line_id"]
        self.current_children = self.sequence[self.i]["children"]

    def doneReading(self):
        return self.i >= len(self.sequence)
    def isLastNumberRead(self):
        return self.i == len(self.sequence) - 1


class Level():
    def __init__(self, read_head=None):
        self.lines = {}
        self.current_point = None
        self.activated_point = None
        self.points = []
        self.sequence_length_parent_line_id = {}
        self.alphabet = {}
        self.child_sequence_length = 0
        self.prev_point = None
        self.parent_point = None
        self.read_head = read_head


    def __str__(self):
        return f"(lines: {self.lines})"

    def addLine(self, number):
        new_line = Line(number, len(self.lines), self)
        self.lines[new_line.id] = new_line

    def adjustConnections(self):
        print(f"before 1")
        print(f"tracker_Point1s: prev {None if self.tracker_Point1s.prev is None else id(self.tracker_Point1s.prev)}, current {None if self.tracker_Point1s.current is None else id(self.tracker_Point1s.current)}")
        for j, line_id in enumerate(self.lines):
            print(f"{line_id} ")
            self.lines[line_id].printLine()
            print("----------")

        print()
        if self.tracker_Point1s.prev is None:
            return
        if self.tracker_Point1s.current is None:
            return
        if self.tracker_Point1s.prev == self.tracker_Point1s.current:
            self.lines[self.tracker_Point1s.prev.line.id].addPoint1(Point1(line=self.lines[self.tracker_Point1s.prev.line.id]))
            self.tracker_Point1s.current = self.lines[self.tracker_Point1s.prev.line.id].current_Point1
            self.tracker_Point1s.prev.next = self.tracker_Point1s.current
            self.tracker_Point1s.prev = None
        elif self.tracker_Point1s.prev.next == self.tracker_Point1s.current:
            self.tracker_Point1s.current = self.lines[self.tracker_Point1s.current.parent].current_Point1
            self.tracker_Point1s.prev = None
        elif self.tracker_Point1s.prev.next != self.tracker_Point1s.current:
            prev_connected_Point1 = self.lines[self.tracker_Point1s.prev.line.id].findConnectedPoint1(self.tracker_Point1s.current.line.id)
            if prev_connected_Point1 is not None:
                self.tracker_Point1s.current = prev_connected_Point1.parent
                self.tracker_Point1s.prev = None
            else:
                if self.tracker_Point1s.prev.next is not None:
                    self.lines[self.tracker_Point1s.prev.line.id].addPoint1(Point1(line=self.lines[self.tracker_Point1s.prev.line.id]))
                    self.tracker_Point1s.prev = self.lines[self.tracker_Point1s.prev.line.id].current_Point1

                self.tracker_Point1s.prev.next = self.tracker_Point1s.current
                self.addLine(self.parent_id)
                self.lines[self.parent_id].addPoint1(Point1(line=self.lines[self.parent_id], parent=self.parent_id))
                self.tracker_Point1s.prev.parent = self.parent_id
                self.tracker_Point1s.current.parent = self.parent_id
                children = [self.tracker_Point1s.prev, self.tracker_Point1s.current]
                self.lines[self.parent_id].current_Point1.children = children

                self.tracker_Point1s.prev = None
                self.tracker_Point1s.current = None

                self.parent_id -= 1

    def processPoints2(self, i, current_numbers):
        print(current_numbers)
        for i, current_number in enumerate(current_numbers):
            if current_number not in self.lines:
                if current_number != -100:
                    self.addLine(current_number)
                    if self.tracker_points2[i] is None:
                        self.tracker_points2[i] = Tracker()
                    self.tracker_points2[i].current = Point1(line=self.lines[current_number])                  
                    self.lines[current_number].addPoint(self.tracker_points2[i].current)
            print(f"i: {i}, current_number: {current_number}")

            if current_number in self.lines:
                self.tracker_points2[i].current = self.lines[current_number].current_point

        for i, tracker_points in enumerate(self.tracker_points2):
            if i > 0:
                if self.tracker_points2[i] is not None and self.tracker_points2[i-1] is not None:
                    if self.tracker_points2[i].current is not None and self.tracker_points2[i-1].current is not None:
                        self.tracker_points2[i].current.lateral = self.tracker_points2[i-1].current
            if i == 0:
                if self.tracker_points2[i] is not None and self.tracker_points2[i+1] is not None:
                    if self.tracker_points2[i].current is not None and self.tracker_points2[i+1].current is not None:
                        self.tracker_points2[i].current.lateral = self.tracker_points2[i+1].current
       
        print(f"before 1")
        for tracker_points in self.tracker_points2:
            print(f"tracker_points2: prev {None if tracker_points.prev is None else id(tracker_points.prev)}, current {None if tracker_points.current is None else id(tracker_points.current)}")
        self.printLines()

        print()
        for i, tracker_points in enumerate(self.tracker_points2):
            if tracker_points.prev is None:
                continue
            if tracker_points.current is None:
                continue
            if tracker_points.prev == tracker_points.current:
                line_id = tracker_points.prev.line.id
                other_tracker_currents = [point_pair.current for point_pair in self.tracker_points2 if point_pair != tracker_points]
                points = [point for point in self.lines[line_id].points if point.lateral is not None and point.lateral in other_tracker_currents]
                if len(points) > 0:
                    if points[0].line.id == line_id:
                        continue
                self.lines[tracker_points.prev.line.id].addPoint(Point1(line=self.lines[tracker_points.prev.line.id]))
                tracker_points.current = self.lines[tracker_points.prev.line.id].current_point
                tracker_points.prev.next = tracker_points.current
                tracker_points.prev = None
            elif tracker_points.prev.next == tracker_points.current:
                tracker_points.current = self.lines[tracker_points.current.parent].current_point
                tracker_points.prev = None
            elif tracker_points.prev.next != tracker_points.current:
                prev_connected_point = self.lines[tracker_points.prev.line.id].findConnectedPoint(tracker_points.current.line.id)
                if prev_connected_point is not None:
                    tracker_points.current = prev_connected_point.parent
                    tracker_points.prev = None
                else:
                    if tracker_points.prev.next is not None:
                        self.lines[tracker_points.prev.line.id].addPoint(Point1(line=self.lines[tracker_points.prev.line.id]))
                        lateral_line_ids = [point.lateral.line.id for point in self.lines[tracker_points.prev.line.id].points if point.lateral is not None]
                        if len(lateral_line_ids) == 1:
                            lateral_line_id = lateral_line_ids[0]
                            self.lines[lateral_line_id].addPoint(Point1(line=self.lines[lateral_line_id]))
                            self.lines[tracker_points.prev.line.id].current_point.lateral = self.lines[lateral_line_id].current_point
                        tracker_points.prev = self.lines[tracker_points.prev.line.id].current_point

                    tracker_points.prev.next = tracker_points.current
                    self.addLine(self.parent_id)
                    self.lines[self.parent_id].addPoint(Point1(line=self.lines[self.parent_id], parent=self.parent_id))
                    tracker_points.prev.parent = self.parent_id
                    tracker_points.current.parent = self.parent_id
                    children = [tracker_points.prev, tracker_points.current]
                    self.lines[self.parent_id].current_point.children = children

                    tracker_points.prev = None
                    tracker_points.current = None

                    self.parent_id -= 1
        
        for tracker_points in self.tracker_points2:
            print(f"tracker_points: prev {None if tracker_points.prev is None else id(tracker_points.prev)}, current {None if tracker_points.current is None else id(tracker_points.current)}")
            tracker_points.prev = tracker_points.current

        print(f"after")
        self.printLines()

        print()
        print()

    def processPoint1s(self, i, current_number):
        # print(f"{self.read_head.sequence}")
        # current_number = self.read_head.current_number
        print(f"i: {i}")
        print(f"current_number: {current_number}")
        # print(f"before")
        # print(f"prev: {'None' if self.tracker_Point1s.prev is None else id(self.tracker_Point1s.prev)}")
        # print(f"current: {id(self.tracker_Point1s.current)}")
        print()
        if current_number not in self.lines:
            self.addLine(current_number)
            self.tracker_Point1s.current = Point1(line=self.lines[current_number])
            self.lines[current_number].addPoint1(self.tracker_Point1s.current)
   
        self.tracker_Point1s.current = self.lines[current_number].current_Point1
    
        self.adjustConnections()

        print(f"tracker_Point1s: prev {None if self.tracker_Point1s.prev is None else id(self.tracker_Point1s.prev)}, current {None if self.tracker_Point1s.current is None else id(self.tracker_Point1s.current)}")
        self.tracker_Point1s.prev = self.tracker_Point1s.current
        # print(self.lines)
        print(f"after")
        for j, line_id in enumerate(self.lines):
            print(f"{line_id} ")
            self.lines[line_id].printLine()
            print("----------")

        print()
        print()

    def printLines(self):
        for line_id in self.lines:
            print(f"{self.lines[line_id].order_id}: {line_id}")
            self.lines[line_id].printLine()
            print("----------")

class F():
    def __init__(self, sequences):
        self.level = Level(sequences)
    # def readLine(self):
    #     for i, number in enumerate(self.level.sequence):
    #         self.level.processPoint1s(i, number)

    def readLine2(self):
        self.level.tracker_points2 = [None] * len(self.level.sequences[0])
        for i, numbers in enumerate(self.level.sequences):
            self.level.processPoints2(i, numbers)


    def addLine(self, number, child_sequence_length=0):
        new_line = Line2(number, self)
        self.lines[new_line.id] = new_line
        self.lines[new_line.id].child_sequence_length = child_sequence_length
    def updateAlphabet(self, number):
        if number in self.alphabet:
            self.alphabet[number] += 1
        else:
            self.alphabet[number] = 1
    def cleanup(self, number):
        self.prev_point = None
        self.lines[number].current_point = None
        self.lines[number].removePoint()
        self.alphabet = {}

    def makeNewLineId(self, child_sequence_length):
        new_line_id = len(self.lines)
        self.sequence_length_parent_line_id[child_sequence_length] = new_line_id
        return new_line_id

    def lastPointIsNone(self):
        if len(self.points) > 0:
            return self.points[-1] is None
    def addToNextReadHead(self, next_level):
        new_line_id = len(next_level.lines)
        # print(f"read head level: {[{'parent_line_id': item['parent_line_id'], 'children': [id(i) for i in item['children']]} for item in next_level.read_head.sequence]}")

        next_level.read_head.sequence.append({"parent_line_id": new_line_id, "children": self.points})

    def visit(self, levels, current_level, current_parent_line_id, current_children):
        if self.lastPointIsNone():
                return self.points
        if current_parent_line_id not in self.lines:
            child_sequence_length = len(current_children)
            if child_sequence_length not in self.sequence_length_parent_line_id:
                self.sequence_length_parent_line_id[child_sequence_length] = current_parent_line_id
            self.addLine(current_parent_line_id, child_sequence_length)
        parent_point = Point(line_ref=self.lines[current_parent_line_id])
        self.lines[current_parent_line_id].addPoint(parent_point)
        parent_point.children = list(current_children)
        print(f"parent_point.children: {parent_point.children}")
        # print(f"lines: {self.lines}")
    
        
        for point in parent_point.children:
            # print(f"point: {point.line_ref.id}")
            point.parent = parent_point
            if len(levels[current_level-1].lines[point.line_ref.id].groups[-1]) > 0:
                levels[current_level-1].lines[point.line_ref.id].current_group += 1
                levels[current_level-1].lines[point.line_ref.id].current_point = None
                levels[current_level-1].lines[point.line_ref.id].groups.append([])
        self.updateAlphabet(current_parent_line_id)
        is_connected = self.lines[current_parent_line_id].connectPoints(self.prev_point)
        self.prev_point = self.lines[current_parent_line_id].current_point
        # self.printLines()
        # print()
        if not is_connected:
            print(f"is_connected0: {is_connected}")
            self.cleanup(current_parent_line_id)
            # print(f"structure sequence broken at line {current_number}")
        new_point = self.prev_point
        self.points.append(new_point)
        return self.points

    def printLines(self):
        for line_id in self.lines:
            print(f"{line_id} child_sequence_length: {self.lines[line_id].child_sequence_length}")
            self.lines[line_id].printLine()
class F():
    def __init__(self, read_head):
        self.levels = [Level(read_head)]

    def makeLevels(self):

        while True:
            if self.levels[0].read_head.i >= len(self.levels[0].read_head.sequence):
                break
            i = 0
            while True:
                if i >= len(self.levels):
                    break
                # print(f"i: {i}")
                # print(f"level_count: {level_count}")
                self.levels[i].read_head.setCurrentNumber()
                # print(f"self.read_head.i: {self.levels[i].read_head.i}")
                # print(f"self.read_head.current_number: {self.levels[i].read_head.current_number}")
                # print(f"self.points: {self.levels[i].points}")
                # print(f"read head level {i}: {[item['parent_line_id'] for item in self.levels[i].read_head.sequence]}")
                points = self.levels[i].visit(self.levels, i, self.levels[i].read_head.current_number, self.levels[i].read_head.current_children)
                # print(f"points: {points}")
                new_point = points[-1]
                # print(f"new_point: {new_point}")
                # print(f"self.levels[i].read_head.isLastNumberRead(): {self.levels[i].read_head.isLastNumberRead()}")
                if new_point is None:
                    self.levels[i].points = points[:-1]
                    # print(f"{i+1} {len(self.levels)} {i + 1 >= len(self.levels)}")
                    # print(f"i: {i}")
                    if i + 1 >= len(self.levels):
                        self.levels.append(Level(ReadHead()))
                    child_sequence_length = len(self.levels[i].points)
                    if child_sequence_length not in self.levels[i+1].sequence_length_parent_line_id:
                        new_line_id = len(self.levels[i+1].lines)
                    else:
                        new_line_id = self.levels[i+1].sequence_length_parent_line_id[child_sequence_length]

                    self.levels[i+1].read_head.sequence.append({"parent_line_id": new_line_id, "children": self.levels[i].points})

                    self.levels[i].points = []
                    self.levels[i].read_head.sequence = self.levels[i].read_head.sequence[child_sequence_length:]
                    # print(f"after crop {child_sequence_length}")
                    # print(f"read head level {i}: {[item['parent_line_id'] for item in self.levels[i].read_head.sequence]}")
                    # print(f"read head level {i+1}: {[{'parent_line_id': item['parent_line_id'], 'children': [id(i) for i in item['children']]} for item in self.levels[i+1].read_head.sequence]}")
                    # print(f"after")
                    # for j, level in enumerate(self.levels):
                    #     print(f"level {j}\n")
                    #     level.printLines()
                    #     print("----------")
                    # print(f"is last number read: {self.levels[i].read_head.isLastNumberRead()}")
                    self.levels[i].read_head.i = -1
                    self.levels[i].read_head.current_number = -1
                self.levels[i].read_head.next2()
                if new_point is None:
                    i += 1
                else:
                    break
            if self.levels[0].read_head.isLastNumberRead():
                break    
        for j, level in enumerate(self.levels):
            print(f"level {j}\n")
            level.printLines()
            print("----------")

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
    f = F([[1, 100], [2, 100], [1, -100], [3, 300]])

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
    f.makeLevels()
    # lines.printLines()
    # print()
    # for line_id in lines.lines:
    #     print(f"line_id: {line_id}, line: {lines.lines[line_id]}")
    #     tracker = lines.lines[line_id].start_Point1
    #     tracker = lines.lines[line_id].start_point
    #     while tracker != None:
    #         print(f"tracker: {tracker}\n")
    #         tracker = tracker.top
    

x25()

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
