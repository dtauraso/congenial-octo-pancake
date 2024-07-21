
class Point:
    def __init__(self, line_id, section_id, point_id):
        self.line_id = line_id
        self.section_id = section_id
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
        return f"(line id: {self.line_id}, section id: {self.section_id}, point id: {self.point_id}, parent: {parent_coordinates}, next: {next_coordinates}, prev: {prev_coordinates}, child: {child_coordinates})"
    def returnCoordinates(self):
        return (self.line_id, self.section_id, self.point_id)

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
        tracker.parent = Point(line_id=streak_count, point_id=0)
        while tracker.parent.line_id > 0:
            if streak_count not in lines:
                lines[streak_count] = [tracker.parent]
            elif streak_count in lines:
                tracker.parent.point_id = len(lines[streak_count])
                lines[streak_count].append(tracker.parent)
            parent_line = tracker.parent
            parent_line.child = Point(line_id=tracker.line_id, point_id=tracker.point_id)
            parent_line.child.parent = Point(line_id=parent_line.line_id, point_id=parent_line.point_id)
            if streak_count == 1:
                break
            tracker = tracker.parent
            tracker.parent = Point(line_id=1, point_id=parent_line.point_id)
            streak_count = 1

    for item in lines:
        print(item)
        [print(str(point)) for point in lines[item]]
        print()

def x3():

    sequence = [1, 1, 1]


    lines = {}
    
    tracker = None
    streak_count = 0
    current_item = 0
    new_sequence = []
    print(sequence)

    for i, item in enumerate(sequence):
        if item not in lines:
            point = Point(line_id=item, section_id=0, point_id=0)
            lines[item] = [[point]]
            tracker = point
            streak_count = 1
        else:
            streak_count += 1
            if tracker.next == None:
                section_id = len(lines[item])-1
                tracker.next = Point(line_id=item, section_id=section_id, point_id=len(lines[item][section_id]))
                lines[item][section_id][-1].next = Point(line_id=tracker.next.line_id, section_id=section_id, point_id=tracker.next.point_id)
                lines[item][section_id][-1].next.prev = Point(line_id=lines[item][section_id][-1].line_id, section_id=section_id, point_id=lines[item][section_id][-1].point_id)
                lines[item][section_id].append(tracker.next)
            if i >= len(sequence)-1:
                continue
            if tracker.next.line_id == sequence[i+1]:
                tracker = tracker.next
    if streak_count > 0:
        tracker = tracker.next            
        tracker.parent = Point(line_id=streak_count, section_id=0, point_id=0)
        while tracker.parent.line_id > 0:
            if streak_count not in lines:
                lines[streak_count] = [[tracker.parent]]
            elif streak_count in lines:
                tracker.parent.point_id = 0
                tracker.parent.section_id = len(lines[streak_count])
                lines[streak_count].append([tracker.parent])
            parent_line = tracker.parent
            parent_line.child = Point(line_id=tracker.line_id, section_id=tracker.section_id, point_id=tracker.point_id)
            parent_line.child.parent = Point(line_id=parent_line.line_id, section_id=section_id, point_id=parent_line.point_id)
            if streak_count == 1:
                break
            tracker = tracker.parent
            streak_count = 1
            section_id = len(lines[streak_count])
            tracker.parent = Point(line_id=1, section_id=section_id, point_id=parent_line.point_id)

    for line in lines:
        print(f"line {line}")
        for i, section in enumerate(lines[line]):
            print(f"{i}")
            for j, point in enumerate(section):
                print(f"    {j} {str(point)}")
        print()

def x4():

    sequence = [1, 2, 1, 1, 3, 1, 3]

    numbers = {}
    lines = {}
    for i, item in enumerate(sequence):
        lines[i] = -1
        if (i - 1) in lines:
            lines[i-1] = i
        if item not in numbers:
            numbers[item] = [i]
        else:
            numbers[item].append(i)

    print(numbers)
    print(lines)


class Point2:
    def __init__(self, line_id, point_id):
        self.line_id = line_id
        self.point_id = point_id
        self.child = None
        self.parent = None
    def __str__(self):
        parent_coordinates = self.parent.returnCoordinates() if self.parent != None else None
        child_coordinates = self.child.returnCoordinates() if self.child != None else None
        next_coordinates = self.next.returnCoordinates() if self.next != None else None
        prev_coordinates = self.prev.returnCoordinates() if self.prev != None else None
        return f"(line id: {self.line_id}, point id: {self.point_id})"

def addGroup(trees, group_id, streak_count, current_item, streak_count_last_tree):

    streak_tree = {}
    

    if streak_count in streak_count_last_tree:
        # print(f"{group_id} {streak_count} {streak_count_last_tree}")
        streak_count_last_tree[streak_count]["joined"] = True
        streak_tree = streak_count_last_tree[streak_count]
        trees[group_id] = {current_item: {streak_count: streak_tree}}
    else:
        trees[group_id] = {current_item: {streak_count: {"joined": False}}}
        if streak_count > 1:
            trees[group_id][current_item][streak_count][1] = {"joined": False, "next group": group_id+1}
        else:
            trees[group_id][current_item][streak_count] = {"joined": False, "next group": group_id+1}
    return trees
def x5():

    sequence = [1, 2, 1, 1, 3, 3, 1, 3]

    numbers = {}
    lines = {}
    group_id = 0
    streak_count = 0
    current_item = sequence[0]
    trees = {}
    print(f"{sequence}")
    for i, item in enumerate(sequence):

        if item != current_item:
            # print(f"{group_id} {streak_count}")
            trees = addGroup(trees, group_id, streak_count, current_item)
            streak_count = 1
            group_id += 1
            current_item = item
        else:
            streak_count += 1
    else:
        if streak_count > 0:
            trees = addGroup(trees, group_id, streak_count, current_item)
        # lines[i] = -1
        # if (i - 1) in lines:
        #     lines[i-1] = i
        # if item not in numbers:
        #     numbers[item] = [i]
        # else:
            # if numbers[item][-1][0] == i-1:
            #     numbers[item][-1].append(i)
            # else:
            # numbers[item].append(i)

    [print(f"{key} {value}") for key, value in trees.items()]
    # print(numbers)
    # print(lines)

def x6():

    sequence = [1, 2, 1, 1, 3, 3, 1, 3]

    numbers = {}
    lines = {}
    group_id = 0
    streak_count = 0
    current_item = sequence[0]
    trees = {}
    streak_count_last_group_id = {}
    print(f"{sequence}")
    for i, item in enumerate(sequence):

        if item != current_item:
            # print(f"{group_id} {streak_count}")
            trees = addGroup(trees, group_id, streak_count, current_item)
            # print(f"current_item: {current_item} group_id: {group_id}")
            # print(f"streak_count_last_group_id: {streak_count_last_group_id}")
            # [print(f"{key} {value}") for key, value in trees.items()]
            # print()
            # print(streak_count_last_group_id)
            if group_id in trees and current_item in streak_count_last_group_id:
                if streak_count_last_group_id[current_item] in trees:
                    trees[streak_count_last_group_id[current_item]]["next"] = trees[group_id]
            streak_count_last_group_id[current_item] = group_id
            streak_count = 1
            group_id += 1
            current_item = item
        else:
            streak_count += 1
    else:
        if streak_count > 0:
            trees = addGroup(trees, group_id, streak_count, current_item)
        #     print(f"current_item: {current_item} group_id: {group_id}")
        #     print(f"streak_count_last_group_id: {streak_count_last_group_id}")
        #     [print(f"{key} {value}") for key, value in trees.items()]
        #     print()
            if group_id in trees and current_item in streak_count_last_group_id:
                if streak_count_last_group_id[current_item] in trees:
                    trees[streak_count_last_group_id[current_item]]["next"] = trees[group_id]
        # lines[i] = -1
        # if (i - 1) in lines:
        #     lines[i-1] = i
        # if item not in numbers:
        #     numbers[item] = [i]
        # else:
            # if numbers[item][-1][0] == i-1:
            #     numbers[item][-1].append(i)
            # else:
            # numbers[item].append(i)

    [print(f"{key} {value}") for key, value in trees.items()]
    # print(numbers)
    # print(lines)

def x7():

    sequence = [1, 2, 1, 1, 2, 2]

    group_id = 0
    streak_count = 0
    current_item = sequence[0]
    trees = {}
    current_item_last_group_id = {}
    streak_count_last_tree = {}
    print(f"{sequence}")
    for i, item in enumerate(sequence):

        if item != current_item:
            # print(f"{group_id} {streak_count}")
            trees = addGroup(trees, group_id, streak_count, current_item, streak_count_last_tree)
            # print(f"current_item: {current_item} group_id: {group_id}")
            # print(f"current_item: {streak_count} group_id: {group_id}")
            # print(f"streak_count_last_group_id: {streak_count_last_tree}")
            # [print(f"{key} {value}") for key, value in trees.items()]
            # print()
            # print(streak_count_last_group_id)
            if group_id in trees and current_item in current_item_last_group_id:
                if current_item_last_group_id[current_item] in trees:
                    trees[current_item_last_group_id[current_item]]["next"] = trees[group_id]
            current_item_last_group_id[current_item] = group_id
            if group_id in trees:
                if current_item in trees[group_id]:
                    if streak_count in trees[group_id][current_item]:
                        streak_count_last_tree[streak_count] = trees[group_id][current_item][streak_count]
            streak_count = 1
            group_id += 1
            current_item = item
        else:
            streak_count += 1
    else:
        if streak_count > 0:
            trees = addGroup(trees, group_id, streak_count, current_item, streak_count_last_tree)
            if group_id in trees and current_item in current_item_last_group_id:
                if current_item_last_group_id[current_item] in trees:
                    trees[current_item_last_group_id[current_item]]["next"] = trees[group_id]

    print()
    [print(f"{key} {value}") for key, value in trees.items()]
    # print(numbers)
    # print(lines)

x7()