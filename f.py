
class Point:
    def __init__(self, line_id, point_id):
        self.line_id = line_id
        self.point_id = point_id
        self.next = None
        self.prev = None
        self.parent = None


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
    
    tracker = {}
    streak_count = 0
    current_item = 0
    new_sequence = []
    print(sequence)

    for _, item in enumerate(sequence):
        if current_item == item:
            streak_count += 1
        if item not in lines:
            point = Point(line_id=item, point_id=0)
            lines[item] = [point]
            tracker[item] = point
        else:
            if tracker[item].next == None:
                tracker[item].next = Point(line_id=item, point_id=len(lines[item]))
                tracker[item].next.prev = lines[item][-1]
                lines[item][-1].next = tracker[item].next
                lines[item].append(tracker[item].next)
            tracker[item] = tracker[item].next

    # if streak_count > 0:
    # print(sequence)

x2()