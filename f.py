
class Point:
    def __init__(self, line_id, point_id):
        self.line_id = line_id
        self.point_id = point_id
        self.is_active = False
        self.sequence_id = 0
        self.children_streak_difference_distance = 0
        self.next = None
        self.prev = None
        self.parent = None
        self.child = None
    def __str__(self):
        parent_coordinates = self.parent.returnCoordinates() if self.parent != None else None
        child_coordinates = self.child.returnCoordinates() if self.child != None else None
        next_coordinates = self.next.returnCoordinates() if self.next != None else None
        prev_coordinates = self.prev.returnCoordinates() if self.prev != None else None
        return f"(line id: {self.line_id}, point id: {self.point_id}, parent: {parent_coordinates}, next: {next_coordinates}, prev: {prev_coordinates}, child: {child_coordinates})"
    def returnCoordinates(self):
        return (self.line_id, self.point_id)

def x():

    sequence = [1, 1, 1, 2]

    streak_count = 0
    current_item = 0
    new_sequence = []
    print(sequence)
    while True:
        if len(sequence) == 1:
            if sequence[0] == 1:
                break
        for _, item in enumerate(sequence):
            if current_item == item:
                streak_count += 1
            else:
                if streak_count == 0:
                    streak_count = 1
                    current_item = item
                    continue
                new_sequence.append(streak_count)
                streak_count = 1
                current_item = item
        if streak_count > 0:
            new_sequence.append(streak_count)
            streak_count = 0
            current_item = 0
        sequence = new_sequence
        new_sequence = []
        print(sequence)

def x2():

    sequence = [1, 1, 1]


    lines = {}
    
    tracker = None
    streak_count = 0
    current_item = 0
    new_sequence = []
    print(sequence)

    for i, item in enumerate(sequence):
        if item not in lines:
            point = Point(line_id=item, point_id=0)
            lines[item] = [point]
            tracker = point
            streak_count = 1
        else:
            streak_count += 1
            if tracker.next == None:
                tracker.next = Point(line_id=item, point_id=len(lines[item]))
                lines[item][-1].next = Point(line_id=tracker.next.line_id, point_id=tracker.next.point_id)
                lines[item][-1].next.prev = Point(line_id=lines[item][-1].line_id, point_id=lines[item][-1].point_id)
                lines[item].append(tracker.next)
            if i >= len(sequence)-1:
                continue
            if tracker.next.line_id == sequence[i+1]:
                tracker = tracker.next
    if streak_count > 0:
        tracker = tracker.next
        parent_line = Point(line_id=streak_count, point_id=0)
        if streak_count not in lines:
            lines[streak_count] = [parent_line]
        elif streak_count in lines:
            parent_line.point_id = len(lines[streak_count])
            lines[streak_count].append(parent_line)
        child_line = lines[tracker.line_id][tracker.point_id]
        child_line.parent = Point(line_id=parent_line.line_id, point_id=parent_line.point_id)
        parent_line.child = Point(line_id=child_line.line_id, point_id=child_line.point_id)
    for item in lines:
        print(item)
        [print(str(point)) for point in lines[item]]
        print()
    # print(sequence)

x2()