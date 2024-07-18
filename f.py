
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
    def __str__(self):
        return f"({self.line_id}, {self.point_id}, {self.parent}, next: {self.next}, prev:{self.prev})"


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
    print_lines = [[item, [str(point) for point in lines[item]]] for item in lines]
    [print(i) for i in print_lines]
    # if streak_count > 0:
    # print(sequence)

x2()