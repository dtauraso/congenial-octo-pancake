import Point1
import XYPoint as xyp

class Grid():
    def __init__(self, level=None):
        # self.id = -1
        self.lines = []
        # self.current_line_id = -1
        # self.current_point_id = -1
        self.level = level
        self.bottom = xyp.XYPoint()
        self.top = xyp.XYPoint()
        self.gap_between_points = 0

    def addLine(self):
        # self.current_line_id = len(self.lines)
        self.lines.append([])

    def addPoints(self, points):
        pass
        # if self.current_line_id == -1:
            # self.lines[0] = {}
            # self.current_line_id = 0            
        # if self.current_point_id == -1:
            # self.lines[self.current_line_id][0] = point
            # self.current_point_id = 0
        # else:
            # self.lines[self.current_line_id].append(point)
        # point.line = self.lines[self.current_line_id]

    def getPoint(self):
        return self.lines[self.current_line_id][self.current_point_id]

    # def inRange(self):
    #     if self.current_line_id < 0 or self.current_line_id > len(self.lines):
    #         return False
    #     if self.current_point_id < 0 or self.current_point_id > len(self.lines[self.current_line_id]):
    #         return False
    #     return True

    # def hasPoint(self):
    #     if not self.inRange():
    #         return False
    #     return True

    # def hasNext(self):
    #     if not self.inRange():
    #         return False
    #     point = self.getPoint()
    #     return point.next is not None

    def processMatch2(self):
        current_tracker = self.level.current_tracker
        new_point = Point1(line=self.level.lines[self.id])
        self.addPoint(new_point)
        current_tracker = self.current_point
        self.level.current_tracker = current_tracker

    def printLine(self):
        for i, point in enumerate(self.points):
            point.printPoint()
