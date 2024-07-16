
class Point:
    def __init__(self, line_id, point_id):
        self.line_id = line_id
        self.point_id = point_id


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
                if streak_count > 0:
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

x()