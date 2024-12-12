
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
    def __init__(self, id, lines_ref):
        self.id = id
        self.groups = [[]]
        self.current_group = 0
        self.current_point = None
        self.lines_ref = lines_ref

    def addPoint(self, point):

        print(f"adding point point: {id(point)}")
        self.groups[self.current_group].append(point)
        self.current_point = point

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
                        if self.lines_ref.alphabet[number] > 1:
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

# class Lines():
#     def __init__(self, order_id=0,read_head_ref=None, level_ref=None):
#         self.lines = {}
#         self.order_id = order_id
#         self.read_head_ref = read_head_ref
#         self.level_ref = level_ref
#         self.prev_point = None
#         self.modulus_clock = -1
#         self.current_clock_length = 0
#         self.start_status = True
#         self.alphabet = {}
#         self.child_sequence_length = 0
#     def __str__(self):
#         return f"(lines: {self.lines})"
#     def addLine(self, line, child_sequence_length=0):
#         self.lines[line.id] = line
#         self.lines[line.id].child_sequence_length = child_sequence_length
#     def f(self, current_clock_length, modulus_clock):
#         # print(f"lines.f self.prev_point: {self.prev_point}, current_clock_length: {current_clock_length}, modulus_clock: {modulus_clock}")
#         if self.prev_point is not None:
#             return self.lines[self.prev_point.line_ref.id].f(current_clock_length, modulus_clock)
#     def removeExpectedPoints(self):
#         if self.prev_point is not None:
#             self.lines[self.prev_point.line_ref.id].removeExpectedPoints()
#     def removeNextExpectedPoints(self):
#         if self.prev_point is not None:
#             self.lines[self.prev_point.line_ref.id].removeNextExpectedPoints()
#     def connectPoints(self, new_point):
#         if self.prev_point:
#             # print(f"connect points")
#             # self.printLines()
#             self.prev_point.next = new_point
#             new_point.prev = self.prev_point
#         self.prev_point = new_point
            
#     def matchLine(self, number, i):
#         print(f"self.order_id: {self.order_id}, number: {number} self.modulus_clock: {self.modulus_clock} self.current_clock_length: {self.current_clock_length} self.start_status: {self.start_status}")
#         # print(f"self.prev_point: {self.prev_point}")
         
#         if number in self.lines:
#             print(f"self.lines[number].isAnyPointExpected(): {self.lines[number].isAnyPointExpected()}")
#             if not self.lines[number].isAnyPointExpected():
#                 if self.start_status:
#                     self.lines[number].setNextPointToExpected()
#                     self.prev_point = self.lines[number].getCurrentPoint()
#                     self.start_status = False
#                     if self.modulus_clock == -1:
#                         self.current_clock_length = self.order_id - 1
#                         self.order_id = 1
#                         self.modulus_clock = 0
#                     self.modulus_clock = (self.modulus_clock + 1) % self.current_clock_length
#                 else:
#                     self.removeNextExpectedPoints()
#                     match = self.f(self.order_id)
#                     print(f"match: {match}")
#                     new_point = Point(line_ref=self.lines[number], order_id=self.order_id)
#                     if match is not None:
#                         new_point.is_expected = True
#                         new_point.next = match.next
#                         self.lines[number].setNextPointToExpected()
#                         self.prev_point = self.lines[number].getCurrentPoint()
#                     else:
#                         self.modulus_clock = -1
#                         self.current_clock_length = 0
#                         self.order_id = 1 #
#                     self.lines[number].addPoint(new_point)
#                     self.connectPoints(self.lines[number].end_point)

#             else:
#                 self.lines[number].removeExpectedPoints()
#                 new_point = Point(line_ref=self.lines[number], order_id=self.order_id, is_expected=True)
#                 self.lines[number].addPoint(new_point)
#                 self.connectPoints(self.lines[number].end_point)
#                 self.lines[number].setNextPointToExpected()
#                 self.modulus_clock = (self.modulus_clock + 1) % self.current_clock_length
#                 if self.modulus_clock == 0:
#                     print(f"structural cycle detected at line {number}")
#                     self.current_clock_length = 0
#                     self.modulus_clock = -1
#                     self.order_id = 1
#                     self.start_status = True
#         else:
#             new_line = Line(number, self)
#             self.addLine(new_line)
#             match = self.f(self.order_id)
#             print(f"match: {match}")
#             # clock length can't be 0 when adding a new line
#             if match is not None:
#                 new_point = Point(line_ref=self.lines[number], order_id=self.order_id, is_expected=True, next=match.next)
#                 self.lines[number].addPoint(new_point)
#                 self.connectPoints(self.lines[number].end_point)
#                 self.modulus_clock = (self.modulus_clock + 1) % self.current_clock_length
#                 if self.modulus_clock == 0:
#                     print(f"structural cycle detected at line {number}")
#             else:
#                 self.lines[number].addPoint(Point(line_ref=self.lines[number], order_id=self.order_id))
#                 self.connectPoints(self.lines[number].end_point)
#                 self.modulus_clock = -1
#                 self.current_clock_length = 0
#                 # self.order_id = 1 #

#             print(f"new line {number} created")
#             print(f"self.modulus_clock: {self.modulus_clock}")
#         print()
#         self.order_id += 1
#         self.getNextInput()
   
#     def addNewPoint(self, number, modulus_clock):
#         new_point = Point(line_ref=self.lines[number], order_id=self.order_id+1)
#         self.order_id += 1
#         match = self.f(modulus_clock.length, modulus_clock.value)
#         print(f"match: {match}")
#         if match is not None:
#             if modulus_clock.cycleComplete():
#                 print(f"structural cycle detected at line {number}")
#                 modulus_clock.turnOff()
#             else:
#                 modulus_clock.increment()
#                 new_point.is_expected = True
#                 new_point.next = match.next
#         else:
#             modulus_clock.turnOff()
#         self.lines[number].addPoint(new_point)
#         return new_point
#     def matchLine2(self, number, i, modulus_clock):
#         if i == 6:
#             return
#         prev_point_id = None if self.prev_point is None else id(self.prev_point)
#         print(f"before: self.prev_point: {prev_point_id}, self.order_id: {self.order_id}, number: {number} modulus_clock.value: {modulus_clock.value} modulus_clock.length: {modulus_clock.length}")
#         if number in self.lines and modulus_clock.isOff():
#             top_order_id = self.lines[number].getTopPointOrderId()
#             clock_length = self.order_id - (top_order_id if top_order_id > 1 else 0)
#             if clock_length > 0:
#                 modulus_clock.start(clock_length)
#                 new_point = Point(line_ref=self.lines[number], order_id=self.order_id+1)
#                 self.order_id += 1
#                 self.lines[number].setNextPointToExpected()
#                 new_point.next = self.lines[number].getNextExpectedPoint()
#                 self.connectPoints(new_point)
#                 self.lines[number].addPoint(new_point)
#                 self.prev_point = new_point
#         elif number in self.lines and modulus_clock.isOn():
#             if self.lines[number].isAnyPointExpected():
#                 modulus_clock.increment()
#                 if modulus_clock.cycleComplete():
#                     print(f"structural cycle detected at line {number}")
#                     modulus_clock.turnOff()
#                 else:
#                     self.lines[number].setNextPointToExpected()
#             else:
#                 new_point = self.addNewPoint(self, number, modulus_clock)
#                 self.connectPoints(new_point)
#         elif number not in self.lines:
#             new_line = Line(number, self)
#             self.addLine(new_line)
#             print(f"new line {number} created")
#             if modulus_clock.isOn():
#                 modulus_clock.increment()
#             new_point = self.addNewPoint(number, modulus_clock)
#             self.connectPoints(new_point)
#             self.prev_point = new_point
#         prev_point_id = None if self.prev_point is None else id(self.prev_point)
#         print(f"after: self.prev_point: {prev_point_id}, self.order_id: {self.order_id}, number: {number} modulus_clock.value: {modulus_clock.value} modulus_clock.length: {modulus_clock.length}")
#         self.printLines()

#         print()
#         print()
#         self.getNextInput(modulus_clock)

#     def matchLine3(self, number, i, modulus_clock):

#         prev_point_id = None if self.prev_point is None else id(self.prev_point)
#         expected_length = 0
#         print(f"before: self.prev_point: {prev_point_id}, self.order_id: {self.order_id}, number: {number}, modulus_clock_isOn2(): {modulus_clock.isOn2()}, modulus_clock.value: {modulus_clock.value} modulus_clock.length: {modulus_clock.length}")
#         if number in self.lines:
#             top_expected_length = self.lines[number].end_point.expected_sequence_length
#             if top_expected_length == 0:
#                 if self.prev_point is not None:
#                     if self.prev_point.line_ref.id == number:
#                         expected_length = 1
#                     elif self.prev_point.expected_sequence_length > 0:
#                         expected_length = self.prev_point.expected_sequence_length
#                     else:
#                         expected_length = self.order_id
#                 else:
#                     expected_length = self.order_id
#             else:
#                 expected_length = top_expected_length
#             print(f"top_expected_length: {top_expected_length}")
#             print(f"expected_length: {expected_length}")
#             print(f"self.order_id: {self.order_id}")
#             if modulus_clock.isOff():
#                 clock_length = expected_length
#                 print(f"clock_length: {clock_length}")
#                 if clock_length == 0:
#                     print(f"structural cycle length == 1 detected at line {number}")
#                     modulus_clock.turnOff()
#                 else:
#                     modulus_clock.start(clock_length)
#         elif number not in self.lines:
#             new_line = Line(number, self)
#             self.addLine(new_line)
#             if self.prev_point is not None:
#                 expected_length = self.prev_point.expected_sequence_length
#         prev_point_id = None if self.prev_point is None else id(self.prev_point)
#         print(f"prev_point: {prev_point_id}")
#         new_point = Point(line_ref=self.lines[number], order_id=self.order_id+1, expected_sequence_length=expected_length)
#         print(f"new_point: {id(new_point)}")
#         if modulus_clock.isOn2():
#             print(f"number: {number} modulus_clock.isOn2(): {modulus_clock.isOn2()}")
#             if self.prev_point is not None:
#                 if self.prev_point.next is not None:
#                     if self.prev_point.next.is_expected:
#                         line_transition_1 = self.prev_point.line_ref.id == new_point.line_ref.id
#                         line_transition_2 = self.prev_point.line_ref.id == self.prev_point.next.line_ref.id
#                         if line_transition_1 != line_transition_2:
#                             print(f"structural cycle broken at line {number}")
#                             if line_transition_1:
#                                 new_point.expected_sequence_length = 1
#                             modulus_clock.turnOff()
#             if modulus_clock.cycleComplete():
#                 print(f"structural cycle detected at line {number}")
#                 modulus_clock.turnOff()
#         if self.prev_point is not None:
#             print(f"self.prev_point: {id(self.prev_point)}")

#             if self.prev_point.prev is not None:
#                 print(f"self.prev_point.prev: {id(self.prev_point.prev)}")

#                 self.prev_point.prev.is_expected = False
#             self.lines[number].setNextPointToExpected()
#             new_point.next = self.lines[number].getNextExpectedPoint()
#         self.order_id += 1
#         self.lines[number].addPoint(new_point)
#         self.connectPoints(new_point)
#         self.prev_point = new_point

#         prev_point_id = None if self.prev_point is None else id(self.prev_point)
#         print(f"after: self.prev_point: {prev_point_id}, self.order_id: {self.order_id}, number: {number}, modulus_clock_isOn2(): {modulus_clock.isOn2()}, modulus_clock.value: {modulus_clock.value} modulus_clock.length: {modulus_clock.length}")
#         self.printLines()
#         if modulus_clock.isOn():
#             modulus_clock.increment()
#         print()
#         print()
#         self.getNextInput(modulus_clock)

#     def visit(self, number):
#         if number not in self.lines:
#             new_line = Line2(number, self)
#             self.addLine(new_line)
#         self.lines[number].addPoint(Point(line_ref=self.lines[number]))
#         if number in self.alphabet:
#             self.alphabet[number] += 1
#         else:
#             self.alphabet[number] = 1
#         is_connected = self.lines[number].connectPoints(self.prev_point)
#         self.prev_point = self.lines[number].current_point
        
#         self.printLines()
#         print()
#         if not is_connected:
#             self.prev_point = None
#             self.lines[number].current_point = None
#             self.lines[number].removePoint()
#             self.alphabet = {}
#             print(f"structure sequence broken at line {number}")
#         return self.prev_point if is_connected else None
        
#     def getNextInput(self, modulus_clock):
#         self.read_head_ref.next(modulus_clock)
#     def printLines(self):
#         for line_id in self.lines:
#             print(f"{line_id} child_sequence_length: {self.lines[line_id].child_sequence_length}")
#             self.lines[line_id].printLine()


class ReadHead():
    def __init__(self, sequence, lines=[]):
        self.sequence = sequence
        self.i = 0
        self.current_number = 0
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
        if 0 > self.i or self.i >= len(self.sequence):
            return
        print(f"self.i: {self.i}")
        # self.current_number = self.sequence[self.i]
        self.i += 1
    def setCurrentNumber(self):
        if 0 > self.i or self.i >= len(self.sequence):
            return
        self.current_number = self.sequence[self.i]

    def doneReading(self):
        return self.i >= len(self.sequence)
    def isLastNumberRead(self):
        return self.i == len(self.sequence) - 1


class Level():
    def __init__(self):
        self.lines = {}
        self.current_point = None
        self.activated_point = None
        self.points = []
        self.sequence_length_parent_line_id = {}
        self.alphabet = {}
        self.child_sequence_length = 0
        self.prev_point = None


    def __str__(self):
        return f"(lines: {self.lines})"
    def addLine(self, line, child_sequence_length=0):
        self.lines[line.id] = line
        self.lines[line.id].child_sequence_length = child_sequence_length
    def visit2(self, number):
        if number not in self.lines:
            new_line = Line2(number, self)
            self.addLine(new_line)
        self.lines[number].addPoint(Point(line_ref=self.lines[number]))
        if number in self.alphabet:
            self.alphabet[number] += 1
        else:
            self.alphabet[number] = 1
        is_connected = self.lines[number].connectPoints(self.prev_point)
        self.prev_point = self.lines[number].current_point
        
        self.printLines()
        print()
        if not is_connected:
            self.prev_point = None
            self.lines[number].current_point = None
            self.lines[number].removePoint()
            self.alphabet = {}
            print(f"structure sequence broken at line {number}")
        return self.prev_point if is_connected else None

    def printLines(self):
        for line_id in self.lines:
            print(f"{line_id} child_sequence_length: {self.lines[line_id].child_sequence_length}")
            self.lines[line_id].printLine()
    def makeNewLine(self, child_sequence_length):
        if child_sequence_length not in self.sequence_length_parent_line_id:
            new_line_id = len(self.lines)
            self.sequence_length_parent_line_id[child_sequence_length] = new_line_id
            self.addLine(Line2(new_line_id, self.lines), child_sequence_length) 
            return self.lines[new_line_id]
        return self.lines[self.sequence_length_parent_line_id[child_sequence_length]]
    def visit(self, read_head):
        print(f"read_head: {read_head}")
        if len(self.points) > 0:
            if self.points[-1] is None:
                return self.points
        new_point = self.visit2(read_head.current_number)
        self.points.append(new_point)
        return self.points

class F():
    def __init__(self, read_head):
        self.levels = [Level(), Level(), Level()]
        self.read_head = read_head

    def makeLevels(self):

        count = 0
        while True:
            # if count == 20:
            #     break
            count += 1
            self.read_head.setCurrentNumber()
            print(f"self.read_head.i: {self.read_head.i}")
            print(f"self.read_head.current_number: {self.read_head.current_number}")
            print(f"self.points: {self.levels[0].points}")

            points = self.levels[0].visit(self.read_head)
            new_point = points[-1]
            print(f"new_point: {new_point}")
            if new_point is None or self.read_head.isLastNumberRead():
                if not self.read_head.isLastNumberRead():
                    self.levels[0].points = points[:-1]
                points = self.levels[0].points
                new_level_made = True
                while new_level_made:
                    for i, level in enumerate(self.levels):
                        if i > 0:
                            continue
                        print(f"i: {i}")
                        print(f"points: {points}")
                        child_sequence_length = len(points)
                        print(f"child_sequence_length: {child_sequence_length}")
                        [print(point.line_ref.id) for point in points]
                        parent_line = self.levels[i+1].makeNewLine(child_sequence_length)
                        parent_point = Point(line_ref=parent_line)
                        self.levels[i+1].lines[parent_line.id].addPoint(parent_point)
                        parent_point.children = points
                        for point in points:
                            point.parent = parent_point
                            level.lines[point.line_ref.id].current_group += 1
                            level.lines[point.line_ref.id].current_point = None
                            level.lines[point.line_ref.id].groups.append([]) 
                        self.current_point = parent_point
                    self.levels[0].printLines()
                    print("----------")
                    self.levels[1].printLines()
                    new_level_made = False
                self.levels[0].points = []
                if self.read_head.isLastNumberRead():
                    break
                self.read_head.prev()
            self.read_head.next2()

def x25():
    # [1, 2, 2, 1, 3, 3]
    # [1, 2, 1, 2, 1, 1]
    # [1, 2, 1, 2, 1, 1, 2, 3, 1, 2, 3]
    # [1, 2, 3, 1, 2, 3, 1, 4, 5]
    # [1, 2, 1, 2, 1, 3, 1, 3]
    # [1, 1, 1, 1, 1]

    f = F(ReadHead([1, 2, 3, 4, 1, 3, 2, 4]))
    # level = Level([1, 2, 3, 4, 2])
    # lines = Lines()
    # read_head = ReadHead([1, 2, 3, 4, 2], lines)
    # lines.read_head_ref = read_head
    # modulus_clock = ModulusClock()

    f.makeLevels()
    # lines.printLines()
    # print()
    # for line_id in lines.lines:
    #     print(f"line_id: {line_id}, line: {lines.lines[line_id]}")
    #     tracker = lines.lines[line_id].start_point
    #     while tracker != None:
    #         print(f"tracker: {tracker}\n")
    #         tracker = tracker.top
    

x25()