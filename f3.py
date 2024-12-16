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
    def __init__(self, sequence=[], lines=[]):
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
        if 0 > self.i or self.i >= len(self.sequence):
            return
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
    def __init__(self, read_head=ReadHead()):
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
        next_level.read_head.sequence.append({"parent_line_id": new_line_id, "children": self.points})

    def visit(self, current_parent_line_id, current_children):
        if self.lastPointIsNone():
                return self.points
        if current_parent_line_id not in self.lines:
            child_sequence_length = len(current_children)
            if child_sequence_length not in self.sequence_length_parent_line_id:
                self.sequence_length_parent_line_id[child_sequence_length] = current_parent_line_id
            self.addLine(current_parent_line_id)
        parent_point = Point(line_ref=self.lines[current_parent_line_id])
        self.lines[current_parent_line_id].addPoint(parent_point)
        parent_point.children = list(current_children)
        prev_group_id = -1
        for point in parent_point.children:
            point.parent = parent_point
            if prev_group_id != -1:
                if prev_group_id != self.lines[point.line_ref.id].current_group:
                    self.lines[point.line_ref.id].current_group += 1
                    self.lines[point.line_ref.id].current_point = None
                    self.lines[point.line_ref.id].groups.append([])
                    prev_group_id = self.lines[point.line_ref.id].current_group
            else:
                prev_group_id = 0

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
        self.levels = [Level(read_head), Level(), Level()]

    def makeLevels(self):

        count = 0
        while True:
            if count == 5:
                break
            count += 1
            i = 0
            level_count = 0
            # move_up_level = True
            while True:
                if level_count == 2:
                    break
                level_count += 1
                self.levels[i].read_head.setCurrentNumber()
                print(f"self.read_head.i: {self.levels[i].read_head.i}")
                print(f"self.read_head.current_number: {self.levels[i].read_head.current_number}")
                print(f"self.points: {self.levels[i].points}")

                points = self.levels[i].visit(self.levels[i].read_head.current_number, self.levels[i].read_head.current_children)
                print(f"before")
                print(f"level 0\n")
                self.levels[0].printLines()
                print("----------")
                print(f"level 1\n")
                self.levels[1].printLines()
                print("----------")
                print(f"level 2\n")
                self.levels[2].printLines()
                print(f"points: {points}")
                new_point = points[-1]
                # print(f"new_point: {new_point}")
                if new_point is None or self.levels[i].read_head.isLastNumberRead():
                    if new_point is None:
                        self.levels[i].points = points[:-1]  
                    self.levels[i].addToNextReadHead(self.levels[i])
                    print(f"read head level 1: {[{'parent': item['parent_line_id'], 'children': [id(i) for i in item['children']]} for item in self.levels[1].read_head.sequence]}")
                    
                        # points = self.levels[0].points
                    # make new parent line number
                    # add new parent line and points to level 1 read_head
                    # make new points with visit function at level 1
                    # repeat for all levels reachable
                    # new_level_made = True
                    # while new_level_made:
                    # print(f"before")
                    print(f"after")
                    print(f"level 0\n")
                    self.levels[0].printLines()
                    print("----------")
                    print(f"level 1\n")
                    self.levels[1].printLines()
                    print("----------")
                    print(f"level 2\n")
                    self.levels[2].printLines()
                    self.levels[i].points = []
                    # print(f"is last number read: {self.read_head.isLastNumberRead()}")
                    if self.levels[i].read_head.isLastNumberRead():
                        break
                    self.levels[i].read_head.prev()
                self.levels[i].read_head.next2()
                if new_point is None:
                        i += 1
                    # print(f"after")
                    # i = 0
                    # move_up_level = True
                    # for i, level in enumerate(self.levels):
                    # prepare for connection from level 0 to level 1
                    # while move_up_level:
                    #     level = self.levels[i]
                    #     if points[-1] is None:
                    #         points = points[:-1]
                        # connect points if can from
                        # if i > 1:
                        #     break
                        # print(f"i: {i}")
                        # print(f"move_up_level: {move_up_level}")
                        # print(f"points: {points}")
                        # child_sequence_length = len(points)
                        # if child_sequence_length == 0:
                        #     continue
                        # if child_sequence_length == 1:
                        #     if points[0] is None:
                        #         break
                        #     break
                        # print(f"child_sequence_length: {child_sequence_length}")
                        # [print(point.line_ref.id) for point in points]
                        # if self.levels[i+1].parent_point is None:
                        #     parent_line = None
                        #     if child_sequence_length not in self.levels[i+1].sequence_length_parent_line_id:
                        #         new_line_id = self.levels[i+1].makeNewLineId(child_sequence_length)
                        #         self.levels[i+1].addLine(new_line_id, child_sequence_length)
                        #         parent_line = self.levels[i+1].lines[new_line_id]
                        #     else:
                        #         parent_line = self.levels[i+1].lines[self.levels[i+1].sequence_length_parent_line_id[child_sequence_length]]
                        #     parent_point = Point(line_ref=parent_line)
                        # else:
                        #     parent_point = self.levels[i+1].parent_point
                        #     self.levels[i+1].parent_point = None
                        # self.levels[i+1].lines[parent_line.id].addPoint(parent_point)
                        # parent_point.children = list(points)
                        # self.levels[i].points = []
                        # prev_group_id = -1
                        # for point in points:
                        #     point.parent = parent_point
                        #     if prev_group_id != -1:
                        #         if prev_group_id != level.lines[point.line_ref.id].current_group:
                        #             level.lines[point.line_ref.id].current_group += 1
                        #             level.lines[point.line_ref.id].current_point = None
                        #             level.lines[point.line_ref.id].groups.append([])
                        #             prev_group_id = level.lines[point.line_ref.id].current_group
                        #     else:
                        #         prev_group_id = 0
                        # self.levels[i+1].updateAlphabet(parent_line.id)
                        # is_connected = self.levels[i+1].lines[parent_line.id].connectPoints(self.levels[i+1].prev_point)
                        # self.levels[i+1].prev_point = self.levels[i+1].lines[parent_line.id].current_point
                        # print(f"is_connected{i+1}: {is_connected}")
                        # print(f"current_point: {self.levels[i+1].lines[parent_line.id].current_point}")
                        # if not is_connected:
                        #     self.levels[i+1].cleanup(parent_line.id)
                        #     print(f"structure sequence broken at line {parent_line.id}")
                        #     print(f"points[i+1]: {[point.line_ref.id for point in points]}")
                        #     self.levels[i+1].parent_point = parent_point
        
                        #     # new_point = self.levels[i+1].prev_point
                        #     self.levels[i+1].points.append(parent_point)
                        # if is_connected:
                        #     move_up_level = False
                        # new_point = self.levels[i+1].prev_point
                        # if len(self.levels[i+1].points) == 2:
                            # self.levels[i+1].points = []
                        # self.levels[i+1].points.append(new_point)
                        # points = self.levels[i+1].points
                        # i += 1
                        # print(f"level 0\n")
                        # self.levels[0].printLines()
                        # print("----------")
                        # print(f"level 1\n")
                        # self.levels[1].printLines()
                        # print("----------")
                        # print(f"level 2\n")
                        # self.levels[2].printLines()
                        # self.levels[i+1].printLines()
                        # print()

                    # print(f"level 0\n")
                    # self.levels[0].printLines()
                    # print("----------")
                    # print(f"level 1\n")
                    # self.levels[1].printLines()
                    # print("----------")
                    # print(f"level 2\n")
                    # self.levels[2].printLines()
                    # new_level_made = False
            if self.levels[0].read_head.isLastNumberRead():
                break    
                
        # print(f"level 0\n")
        # self.levels[0].printLines()
        # print("----------")
        # print(f"level 1\n")
        # self.levels[1].printLines()
        # print("----------")
        # print(f"level 2\n")
        # self.levels[2].printLines()
def x25():
    # [1, 2, 2, 1, 3, 3]
    # [1, 2, 1, 2, 1, 1]
    # [1, 2, 1, 2, 1, 1, 2, 3, 1, 2, 3]
    # [1, 2, 3, 1, 2, 3, 1, 4, 5]
    # [1, 2, 1, 2, 1, 3, 1, 3]
    # [1, 1, 1, 1, 1]
    # 2, 1, 3
    f = F(ReadHead([{"parent_line_id":i, "children": []} for i in [1, 2, 3, 4, 1, 3, 2, 4, 4, 2, 1, 3, 3, 1, 4, 2, 2, 1, 3]]))
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