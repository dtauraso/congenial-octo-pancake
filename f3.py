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
    def addPoint(self, point):

        # print(f"adding point point: {id(point)}")
        point.point_position = len(self.points)
        self.points.append(point)
        self.current_point = point

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


    def __str__(self):
        return f"(lines: {self.lines})"

    def addLine(self, number):
        new_line = Line(number, len(self.lines), self)
        self.lines[new_line.id] = new_line

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
        self.level = Level(sequences)
    # def readLine(self):
    #     for i, number in enumerate(self.level.sequence):
    #         self.level.processPoint1s(i, number)

    def readLine2(self):
        self.level.tracker_points2 = [None] * len(self.level.sequences[0])
        for i, numbers in enumerate(self.level.sequences):
            self.level.processPoints2(i, numbers)

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
    f.readLine2()
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