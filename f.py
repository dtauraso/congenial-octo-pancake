
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
        if "next group" in streak_count_last_tree[streak_count]:
            streak_count_last_tree[streak_count]["next group"][group_id] = group_id+1
        streak_tree = streak_count_last_tree[streak_count]
        trees[group_id] = {current_item: {streak_count: streak_tree}}
    else:
        trees[group_id] = {current_item: {streak_count: {"joined": False}}}
        if streak_count > 1:
            trees[group_id][current_item][streak_count][1] = {"joined": False, "next group": {group_id: group_id+1}}
        else:
            trees[group_id][current_item][streak_count] = {"joined": False, "next group": {group_id: group_id+1}}
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

    sequence = [1, 2, 1, 1, 2, 2, 4, 3, 3]

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

def addGroup2(trees, group_id, streak_count, current_item, streak_count_last_tree):

    streak_tree = {}
    

    # print(f"{group_id} {streak_count} {streak_count_last_tree}")

    if streak_count in streak_count_last_tree:
        # print(f"{group_id} {streak_count} {streak_count_last_tree}")
        streak_count_last_tree[streak_count]["joined"] = True
        if "next group" in streak_count_last_tree[streak_count]:
            streak_count_last_tree[streak_count]["next group"][group_id] = group_id+1
        streak_tree = streak_count_last_tree[streak_count]
        trees[group_id] = {current_item: {streak_count: streak_tree}}
        streak_count_level_2 = streak_count_last_tree[streak_count]
        if 1 in streak_count_level_2:
            streak_count_level_2[1]["joined"] = True
            if "next group" in streak_count_level_2[1]:
                streak_count_level_2[1]["next group"][group_id] = group_id+1
                streak_tree = streak_count_level_2[1]
                trees[group_id][current_item][streak_count] = streak_tree
    else:
        trees[group_id] = {current_item: {streak_count: {"joined": False}}}
        if streak_count > 1:
            trees[group_id][current_item][streak_count][1] = {"joined": False, "next group": {group_id: group_id+1}}
        else:
            trees[group_id][current_item][streak_count] = {"joined": False, "next group": {group_id: group_id+1}}
    return trees
   
def x8():

    sequence = [1, 1, 1, 2, 2, 3, 1, 1, 1, 2, 2, 3]

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
            trees = addGroup2(trees, group_id, streak_count, current_item, streak_count_last_tree)
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
            trees = addGroup2(trees, group_id, streak_count, current_item, streak_count_last_tree)
            if group_id in trees and current_item in current_item_last_group_id:
                if current_item_last_group_id[current_item] in trees:
                    trees[current_item_last_group_id[current_item]]["next"] = trees[group_id]

    print()
    [print(f"{key} {value}") for key, value in trees.items()]

def x9():

    sequence = [1, 1, 1, 2, 2, 3, 1, 1, 1, 2, 2, 3, 4]

    group_id = 0
    streak_count = 0
    current_item = sequence[0]
    trees = {}
    current_item_last_group_id = {}
    current_item_last_tree = {}
    matching_sequence = False
    print(f"{sequence}")
    for i, item in enumerate(sequence):
        # print(f"{i} {item} {current_item} {matching_sequence}")
        if item != current_item:
            # print(f"{group_id} {current_item} {streak_count}")
            # if len(current_item_last_tree) > 0:
            #     print(f"current_item_last_tree:")
            #     [print(f"{key} {value}") for key, value in current_item_last_tree.items()]
            if current_item in current_item_last_tree:
                if not matching_sequence:
                    matching_sequence = True
                root = current_item_last_tree[current_item]
                while "next group" not in root:
                    root = root[list(root.keys())[0]]
                print(f"current_item {current_item} next group {root['next group']}")
            else:
                # print(f"here {item} {current_item} {matching_sequence}")
                trees[group_id] = {current_item: {streak_count: {}}}
                if streak_count > 1:
                    trees[group_id][current_item][streak_count][1] = {"next group": {group_id: group_id+1}}
                else:
                    trees[group_id][current_item][streak_count] = {"next group": {group_id: group_id+1}}
                current_item_last_group_id[current_item] = group_id
                if group_id in trees:
                    if current_item in trees[group_id]:
                            current_item_last_tree[current_item] = trees[group_id][current_item]
                group_id += 1
            streak_count = 1
            current_item = item
        else:
            streak_count += 1
    else:
        if streak_count > 0:
            # print(f"{group_id} {current_item} {streak_count}")
            # if len(current_item_last_tree) > 0:
            #     print(f"current_item_last_tree:")
            #     [print(f"{key} {value}") for key, value in current_item_last_tree.items()]
            if current_item in current_item_last_tree:
                root = current_item_last_tree[current_item]
                while "next group" not in root:
                    root = root[list(root.keys())[0]]
                print(f"current_item {current_item} next group {root['next group']}")
            else:
                if matching_sequence:
                    print(f"i: {i-1} is end of sequence streak")
                    print(f"group_id: {group_id - 1}")
                    matching_sequence = False
                trees[group_id] = {current_item: {streak_count: {}}}
                if streak_count > 1:
                    trees[group_id][current_item][streak_count][1] = {"next group": {group_id: group_id+1}}
                else:
                    trees[group_id][current_item][streak_count] = {"next group": {group_id: group_id+1}}

            # trees = addGroup3(trees, group_id, streak_count, current_item, streak_count_last_tree)
            # if group_id in trees and current_item in current_item_last_group_id:
            #     if current_item_last_group_id[current_item] in trees:
            #         trees[current_item_last_group_id[current_item]]["next"] = trees[group_id]

    print()
    [print(f"{key} {value}") for key, value in trees.items()]

def x10():
# [1, 1, 1, 2, 2, 4, 4, 2, 2, 6]
# [1, 1, 1, 2, 2, 1, 1, 1, 2, 2, 3]
    sequence = [1, 1, 1, 2, 2, 4, 4, 1, 1, 1, 2, 2, 6]

    group_id = 0
    streak_count_2 = 0
    current_streak_count_1 = sequence[0]
    sequence_id = 0
    sequences = {}
    tree = {}
    print(f"{sequence}")
    for i, streak_count_1 in enumerate(sequence):
        # print(f"{i} {item} {current_item} {matching_sequence}")
        if streak_count_1 != current_streak_count_1:
            # print(f"{group_id} {current_item} {streak_count}")
            # if len(current_item_last_tree) > 0:
            #     print(f"current_item_last_tree:")
            #     [print(f"{key} {value}") for key, value in current_item_last_tree.items()]
            # make streak reverse tree
            streak_counts = [streak_count_2, current_streak_count_1]
            if streak_count_2 > 1:
                streak_counts.insert(0, 1)
            # reverse_streak_tree = {}
            subtree = tree
            match_count = 0
            print(f"streak_counts: {streak_counts}")
            order_id = 0
            for i, streak_count in enumerate(streak_counts):
                # "l": len(streak_counts) - i
                if streak_count not in subtree:
                    subtree[streak_count] = {"order id": group_id, "sequence id": [sequence_id]} if streak_count > 1 else {}
                else:
                    if "sequence id" in subtree[streak_count]:
                        subtree[streak_count]["sequence id"].append(sequence_id)
                    if "order id" in subtree[streak_count]:
                        order_id = subtree[streak_count]["order id"]
                    match_count += 1
                # if streak_count > 1:
                
                subtree = subtree[streak_count]
            if sequence_id not in sequences:
                sequences[sequence_id] = []
            sequences[sequence_id].append({order_id + group_id: streak_counts})
            if match_count == len(streak_counts):
                sequences[sequence_id].append({order_id: streak_counts})
                print(f"sequence {sequence_id} is finished")
                # print(f"{sequence_id}, {tree}")
                [print(f"{key} {value}") for key, value in sequences.items()]
                [print(f"{key} {value}") for key, value in tree.items()]

                print()
                sequence_id += 1
            # [print(f"{key} {value}") for key, value in tree.items()]
            # print()
            # print(f"tree: {tree}")

            # print(f"reverse_streak_tree: {reverse_streak_tree}")
                # print(f"here {item} {current_item} {matching_sequence}")
            # tree[group_id] = {current_streak_count_1: {streak_count_2: {}}}
            # if streak_count_2 > 1:
            #     tree[group_id][current_streak_count_1][streak_count_2][1] = {"next group": {group_id: group_id+1}}
            # else:
            #     tree[group_id][current_streak_count_1][streak_count_2] = {"next group": {group_id: group_id+1}}
            group_id += 1
            streak_count_2 = 1
            current_streak_count_1 = streak_count_1
        else:
            streak_count_2 += 1
            # trees = addGroup3(trees, group_id, streak_count, current_item, streak_count_last_tree)
            # if group_id in trees and current_item in current_item_last_group_id:
            #     if current_item_last_group_id[current_item] in trees:
            #         trees[current_item_last_group_id[current_item]]["next"] = trees[group_id]

    filter_sequence = [1, 2, 4]
    root = tree
    sequence_ids = []
    for i, streak_count in enumerate(filter_sequence):
        root = root[streak_count]
        if i == len(filter_sequence)-1:
            if "sequence id" in root:
                for i in root["sequence id"]:
                    sequence_ids.append(root["sequence id"][i])
    print(f"sequence_ids: {sequence_ids}")
    for sequence_id in sequence_ids:
        print(f"sequences: {sequences[sequence_ids[sequence_id]]}")
    print()
    [print(f"{key} {value}") for key, value in tree.items()]

def x11():

    sequence = [1, 2, 3, 1, 2, 3, 1, 2, 3]

    numbers = {}
    number_window_start_numbers = {sequence[0]: 0}
    print(f"{sequence}\n")
    first_revisit = True
    for i, item in enumerate(sequence):

        if item not in numbers:
            numbers[item] = [i]
        else:
            if first_revisit:
                first_revisit = False
                print(f"i: {i} first revisit {item} {numbers}")
            numbers[item].append(i)
            number_window_start_numbers[item] = i
            
            # print(f"i: {i} revisit {item} {numbers}")
            if item in number_window_start_numbers:
                print(f"i: {i} item: {item} {number_window_start_numbers[item]} {numbers[item]}")

    
    print()
    print(numbers)
    # print(number_window_start_numbers)

def x12():

    from collections import OrderedDict
# [1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 4]
# [1, 1, 1, 2, 1, 1, 1, 2, 2]
    sequence = [1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 4]

    
    x = OrderedDict()
    numbers = OrderedDict()
    number_window_start_numbers = {}
    sequence_id = 0
    print(f"{sequence}\n")
    expected_number = 0
    current_position = 0
    sequence_length = 0
    streak_count = 0
    for i, item in enumerate(sequence):

        print(f"{current_position}")
        if sequence_length > 0:
            # print(f"{numbers.items()} {current_position}")
            expected_number, sequence_ids = list(x.items())[current_position]
            print(f"i: {i} expected_number: {expected_number} {item}")
            if item != expected_number:
                print(f"length {len(x)} sequence streak {streak_count+1} broke")
        if item not in numbers:
            numbers[item] = [sequence_id]
            if item not in x:
                x[item] = [sequence_id]
            else:
                x[item].append(sequence_id)
        else:
            if sequence_length == 0:
                sequence_length = len(x)
            print(f"i: {i} revisit {item} {x} sequence_id: {sequence_id}")
            if item not in number_window_start_numbers:
                number_window_start_numbers[item] = [sequence_id]
            else:
                number_window_start_numbers[item].append(sequence_id)
                # print(f"i: {i} revisit {item} {numbers}")
                print(f"i: {i} item: {item} {number_window_start_numbers[item]}, sequence_id: {sequence_id}")
            numbers = OrderedDict()
            sequence_id += 1
            streak_count += 1
        if sequence_length > 0:
            current_position = (current_position + 1) % sequence_length


    
    print()
    print(numbers)
    print(number_window_start_numbers)
    print(x)

def x13():

    sequences = [[1, 2, 3], [1, 4, 3]]
    numbers = {}
    sequence_id = 0
    prev_sequence_id = 0
    prev_number = -1
    for sequence in sequences:
        for i, current_number in enumerate(sequence):
            # print(f"i: {i} current_number: {current_number}")
            if current_number not in numbers:
                if i == 0:
                    numbers[current_number] = {sequence_id: {
                            "current sequence": {"prev": -1, "next": -1},
                            "next sequence": {"prev": -1, "next": -1}}}
                if i > 0:
                    numbers[current_number] = {sequence_id: {
                        "current sequence": {"prev": prev_number, "next": -1},
                        "next sequence": {"prev": -1, "next": -1}}}
                    numbers[prev_number][sequence_id]["current sequence"]["next"] = current_number
            else:
                if i == 0:
                    numbers[current_number][sequence_id] = {
                            "current sequence": {"prev": -1, "next": -1},
                            "next sequence": {"prev": prev_sequence_id, "next": -1}}
                    numbers[current_number][prev_sequence_id]["next sequence"]["next"] = sequence_id
                if i > 0:
                    numbers[current_number][sequence_id] = {
                        "current sequence": {"prev": prev_number, "next": -1},
                        "next sequence": {"prev": prev_sequence_id, "next": -1}}
                    numbers[prev_number][sequence_id]["current sequence"]["next"] = current_number
                    numbers[current_number][prev_sequence_id]["next sequence"]["next"] = sequence_id

            prev_number = current_number
        prev_number = -1
        prev_sequence_id = sequence_id
        sequence_id += 1

    for key, value in numbers.items():
        print(key)
        [print(f"{key} {value}") for key, value in value.items()]
        print("\n")
    # print(f"{i} {numbers} {prediction_order_number} {successful_prediction}")

def x14():

    sequences = [[1, 2, 3], [1, 4, 3]]
    numbers = {}
    sequence_id = 0
    prev_sequence_id = 0
    prev_number = -1
    for sequence in sequences:
        for i, current_number in enumerate(sequence):
            # print(f"i: {i} current_number: {current_number}")
            if current_number not in numbers:
                if i == 0:
                    numbers[current_number] = {sequence_id: {
                            "current sequence": {"prev": -1, "next": -1},
                            "next sequence": {"prev": -1, "next": -1},
                            "parent": {"s": sequence_id}}}
                if i > 0:
                    print(f"i: {i} numbers: {numbers[prev_number]}")
                    numbers[current_number] = {sequence_id: {
                        "current sequence": {"prev": prev_number, "next": -1},
                        "next sequence": {"prev": -1, "next": -1},
                        "parent": numbers[prev_number][sequence_id]["parent"]}}
                    numbers[prev_number][sequence_id]["current sequence"]["next"] = current_number
            else:
                if i == 0:
                    numbers[current_number][sequence_id] = {
                            "current sequence": {"prev": -1, "next": -1},
                            "next sequence": {"prev": prev_sequence_id, "next": -1},
                             "parent": {"s": sequence_id}}
                    numbers[current_number][prev_sequence_id]["next sequence"]["next"] = sequence_id
                if i > 0:
                    numbers[current_number][sequence_id] = {
                        "current sequence": {"prev": prev_number, "next": -1},
                        "next sequence": {"prev": prev_sequence_id, "next": -1},
                        "parent": numbers[prev_number][sequence_id]["parent"]}
                    numbers[prev_number][sequence_id]["current sequence"]["next"] = current_number
                    numbers[current_number][prev_sequence_id]["next sequence"]["next"] = sequence_id

            prev_number = current_number
        prev_number = -1
        prev_sequence_id = sequence_id
        sequence_id += 1

    for key, value in numbers.items():
        print(key)
        [print(f"{key} {value}") for key, value in value.items()]
        print("\n")
    # print(f"{i} {numbers} {prediction_order_number} {successful_prediction}")

x14()