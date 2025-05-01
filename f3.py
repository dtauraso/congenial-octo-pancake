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

    def __init__(self, prev=None, next=None, lateral=None, line=None):
        self.prev = prev
        self.next = next
        if lateral is None:
            self.lateral = []
        self.line = line

    def __str__(self):
        next = None if self.next is None else id(self.next)
        lateral = None if self.lateral is None else id(self.lateral)
        return f"(Point1 id: {id(self)}, next: {next}, lateral: {lateral} parents: {self.parents}, line id: {self.line.id})"


    def connectNext(self, new_point):
        self.next = new_point

    def printPoint(self):
        print(f"{self}")
        children = [] if self.children is None else [id(child) for child in self.children if child is not None]
        if len(children) > 0:
            print(f"    children:")
            for child in children:
                print(f"        {child}")

class Clock():
    def __init__(self):
        self.count = 0
        self.last_count = -1

class XYPoint():
    def __init__(self, x=0, y=0):
        self.x = x
        self.y = y

class Line():
    def __init__(self, id, order_id, level):
        self.id = id
        self.order_id = order_id
        self.points = []
        self.current_point = None
        self.level = level
        self.bottom = XYPoint()
        self.top = XYPoint()
        self.gap_between_points = 0

    def isActive(self):
        return self.current_point is not None

    def canConnectPoints(self, tracker):
        if tracker.line.id == self.id:
            return True
        else:
            pass

    def addPoint(self, point):

        # print(f"adding point point: {id(point)}")
        point.point_position = len(self.points)
        self.points.append(point)
        self.current_point = point

    def updateParentsAndChildren(self, current_tracker, point):
        point.children = current_tracker.children
        for child in enumerate(current_tracker.children):
            child.parents.append(point)

    def processMatch2(self):
        current_tracker = self.level.current_tracker
        new_point = Point1(line=self.level.lines[self.id])
        self.addPoint(new_point)
        current_tracker = self.current_point
        self.level.current_tracker = current_tracker

    def processMatch(self):
        current_tracker = self.level.current_tracker
        if current_tracker is None:
            if len(self.points) == 0:
                new_point = Point1(line=self.level.lines[self.id])
                self.addPoint(new_point)
            current_tracker = self.current_point
            self.level.current_tracker = current_tracker
        elif current_tracker.next is not None:
            if current_tracker.next.line.id == self.id:
                current_tracker = current_tracker.next
        else:
            connection_points = [point for point in self.points
                        if point is not current_tracker and point.next is not None and point.next.line.id == self.id]
            if len(connection_points) > 0:
                self.updateParentsAndChildren(current_tracker, connection_points[0])
                current_tracker.next = connection_points[0]
                current_tracker = current_tracker.next
            elif current_tracker.next is None:
                new_point = Point1(line=self.level.lines[self.id])
                self.addPoint(new_point)
                current_tracker.next = new_point
                current_tracker = current_tracker.next
            elif current_tracker.next.line.id != self.id:
                new_point = Point1(line=self.level.lines[self.id])
                self.addPoint(new_point)
                self.updateParentsAndChildren(current_tracker, new_point)
                current_tracker.next = new_point
                current_tracker = current_tracker.next
        self.level.current_tracker = current_tracker


    def mergeParents(self, tracker_1):
        points = []
        tracker = tracker_1
        while tracker.prev is not None:
            points.append(tracker)
            tracker = tracker.prev
        new_point = Point1(line=self.level.lines[self.id])
        new_point.children = [point.child for point in points]
        for point in points:
            point.child.parent = new_point
        self.addPoint(new_point)
        self.points = [point for point in self.points if point not in points]
    
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
        self.active_line_id = 0
        self.tracker_points = Tracker()
        self.tracker_points2 = []
        self.current_tracker = None
        self.sequences = sequences
        self.section_name = ""
        self.f = None
        self.top_left_front_xy_point = XYPoint()
        self.bottom_right_back_xy_point = XYPoint()


    def __str__(self):
        return f"(lines: {self.lines})"

    def addLine(self, number):
        new_line = Line(number, len(self.lines), self)
        self.lines[new_line.id] = new_line

    def adjustLateralConnections(self, tracker_1, tracker_2):
        tracker_1.prev.lateral.append(tracker_2)
        tracker_2.lateral = [tracker_1.prev]
        tracker_1.prev.next = None
        tracker_1.line.points.pop()

    def backupTrackers(self, tracker_1, tracker_2):
        tracker_1.line.points.pop()
        tracker_1.line.points.pop()
        tracker_1 = tracker_1.prev
        tracker_2 = tracker_2.prev

    def makeLateralConnections2(self, tracker_1, tracker_2):
        if tracker_1 is None and tracker_2 is None:
            return
        if tracker_1.prev is None or tracker_2.prev is None:
            return
        if tracker_1.prev.line.id == tracker_1.line.id and tracker_2.prev.line.id != tracker_2.line.id:
            self.adjustLateralConnections(tracker_1, tracker_2)
        elif tracker_1.prev.line.id != tracker_1.line.id and tracker_2.prev.line.id == tracker_2.line.id:
            self.adjustLateralConnections(tracker_2, tracker_1)
        elif tracker_1.line.id == tracker_2.line.id:
            self.backupTrackers(tracker_1, tracker_2)

    def makeLateralConnections(self, tracker_1, tracker_2):
        if tracker_1 is not None and tracker_2 is not None:
            if tracker_1.lateral is None and tracker_2.lateral is None:
                tracker_1.lateral = tracker_2
                tracker_2.lateral = tracker_1
        trackers = [tracker_1, tracker_2]
        for i, tracker in enumerate(trackers):
            remaining_items_are_none = all(item for item in trackers if item != tracker and item is None)
            for item in remaining_items_are_none:
                if tracker is not None:
                    item = tracker.lateral
                else:
                    connection_points = [point for point in tracker.line.points
                                        if point is not tracker and point.lateral is not None]
                if len(connection_points) > 0:
                    item = connection_points[0].lateral

    def findIntersectionLines(self, tracker_1, tracker_2):
        trackers = [tracker_1, tracker_2]
        for first_tracker in trackers:
            for second_tracker in [tracker for tracker in trackers if tracker != first_tracker]:
                points_first = first_tracker.line.points
                lateral_line_ids_first = {point.lateral.line.id: True for point in points_first}
                points_second = second_tracker.line.points
                lateral_line_ids_second = {point.lateral.line.id: True for point in points_second}
                if len(lateral_line_ids_first) > 0 and len(lateral_line_ids_second) > 0:
                    have_same_ids = any(id for id in lateral_line_ids_first
                                    if id in lateral_line_ids_second)
                    if have_same_ids:
                        if len(lateral_line_ids_first) > len(lateral_line_ids_second):
                            pass
                        elif len(lateral_line_ids_first) < len(lateral_line_ids_second):
                            pass

    def makeParentLine(self, trackers):
        parents = trackers[0].parents
        for tracker in trackers[1:]:
            parents = [parent for parent in tracker.parents if parent in parents]
        if len(parents) == 0:
            new_line_id = len(self.lines)
            self.addLine(new_line_id)
            new_point = Point1(line=self.level.lines[new_line_id])
            self.level.lines[new_line_id].addPoint(new_point)
            self.level.lines[new_line_id].updateParentsAndChildren(tracker, new_point)

    def processPoints3(self, current_number):
        if current_number not in self.lines:
            self.addLine(current_number)
        
        print(f"current_number: {current_number}")

        self.lines[current_number].processMatch()
        self.printLines()
        print()


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