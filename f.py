
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
# [[3, 3, 3], [4]], [[1, 1, 1], [3]]
    sequence_groups = [[[1, 1, 1], [2, 2, 2], [3, 3, 3]], [[1, 1]]]
    numbers = {"dimensions": {0: {}, 1: {}}}

    for sequences in sequence_groups:
        next_dimension_parent = ["dimensions", 1]
        if len(sequences) > 1:
            next_dimension_parent.append(len(sequences[0]))
            next_dimension_parent.append(1)
        for i, sequence in enumerate(sequences):
            # print(f"i: {i} current_number: {current_number}")
            number = sequence[0]
            streak_count = len(sequence)
            # print(f"number: {number} {sequence} {streak_count}")
            if number not in numbers["dimensions"][0]:
                numbers["dimensions"][0][number] = {streak_count:{"prev": -1, "next": -1, "next_dimension_parent": next_dimension_parent}}
            else:
                numbers["dimensions"][0][number][streak_count] = {"prev": -1, "next": -1, "next_dimension_parent": next_dimension_parent}
                numbers["dimensions"][0][number][streak_count]["next_dimension_parent"].extend([streak_count, 1])
            if streak_count not in numbers["dimensions"][1]:
                numbers["dimensions"][1][streak_count] = {1: {"prev": -1, "next": -1,
                                                            "next_dimension_parent": [],
                                                            "next_dimension_children": [["dimensions", 0, number, streak_count]]}}
            else:
                numbers["dimensions"][1][streak_count][1]["next_dimension_children"].append(["dimensions", 0, number, streak_count])
            

    for key, value in numbers.items():
        print(key)
        [print(f"{key} {value}") for key, value in value.items()]
        print("\n")
    print(f"{findDifferentSequenceSameStreakNumber([1, 1, 1], numbers)}")
    # print(f"{i} {numbers} {prediction_order_number} {successful_prediction}")

def getPoint(vector, tree):
    root = tree
    for coordinate in vector:
        root = root[coordinate]
    return root

def findDifferentSequenceSameStreakNumber(sequence, numbers):
    vector = ["dimensions", 0, sequence[0], len(sequence)]
    
    next_dimension_parent = getPoint(vector, numbers)["next_dimension_parent"]
    next_dimension_point = getPoint(next_dimension_parent, numbers)
    different_sequences = [[i[-2]] * i[-1] for i in next_dimension_point["next_dimension_children"] if i != vector]

    return different_sequences

def x15():
    # 2, 2, 2, 3, 3, 3, 1, 1
    sequences = [1, 1, 1]

    print(f"{sequences}")
    level_count = 2
    current_level = 0
    while len(sequences) > 0:
        if current_level >= level_count:
            break
        if len(sequences) == 1 and sequences[0] == 1:
            break
        new_sequences = []
        current_streak_number = sequences[0]
        current_streak_count = 0
        for i, sequence in enumerate(sequences):
            if sequence == current_streak_number:
                current_streak_count += 1
            else:
                new_sequences.append(current_streak_count)
                current_streak_number = sequence
                current_streak_count = 1
        else:
            if current_streak_count > 0:
                new_sequences.append(current_streak_count)
        current_level += 1
        sequences = new_sequences
        print(f"{sequences}")


def makeGroups(sequence):

    from collections import OrderedDict as od

    consistency_values = {}
    groups = od({})
    points = []
    current_member = {}
    for i, number in enumerate(sequence):
        if number not in consistency_values:
            consistency_values[number] = 1
        else:
            consistency_values[number] += 1
        x = [(key, value) for key, value in consistency_values.items()]
        x.sort(key=lambda x: x[1], reverse=True)
        winning_numbers = [i[0] for i in x if i[1] == x[0][1]]
        if number not in groups:
            groups[number] = [[i]]
            current_member[number] = 0
        else:
            if groups[number][current_member[number]][-1] == i - 1:
                groups[number][current_member[number]].append(i)
            else:
                current_member[number] += 1
                groups[number].append([i])
        points.append(number)
        # print(f"points: {points}")
        # print(f"groups: {groups}")
        # print(f"consistency_values: {x}")
        # print(f"winning_numbers: {winning_numbers}")
        # print(f"\n")

    return groups
def x16():

    # groups: OrderedDict([(1, [[0, 1]]), (2, [[2]])])
    # groups: OrderedDict([(1, [[0], [2]]), (2, [[1]])])
    # groups: OrderedDict([(1, [[0], [1]]), (2, [[2]])])

    sequence = [1, 1, 2]

    groups1 = makeGroups(sequence)
    print(f"groups1: {groups1}")

    scrambled_sequence = [1, 2, 1]

    groups2 = makeGroups(scrambled_sequence)
    print(f"groups2: {groups2}")

    groups2_members_not_matched = {}
    for group1_member, group2_member in zip(groups1.items(), groups2.items()):
        print(f"group1_member: {group1_member} group2_member: {group2_member}")
        for member1, member2 in zip(group1_member[1], group2_member[1]):
            print(f"member1: {member1} member2: {member2}")
            while len(member1) < len(member2):
                member1.append(-1)
            while len(member2) < len(member1):
                member2.append(-1)
            # print(f"zipped {zip(member1, member2)}")
            for number1, number2 in zip(member1, member2):
                print(f"number1: {number1} number2: {number2}")
            if number1 != number2:
                if number1 not in groups2_members_not_matched:
                    groups2_members_not_matched[group1_member[0]] = [group2_member[1][0]]
                else:
                    groups2_members_not_matched[group1_member[0]].append(group2_member[1][0])

    print(f"groups2_members_not_matched: {groups2_members_not_matched}")


def x17():
    sequences1 = [[1], [2], [1]]
    sequences2 = [[[1, 2], [1, 3]], [[2, 2], [2, 4]], [2]]
    correct_sequences = [{2: [2, 1]}, {2: [2, 4]}, {1: [2]}]
    numbers = {}


    current_streak_number = sequence[0]
    current_streak_count = 0
    for number in sequence:
        if number == current_streak_number:
            current_streak_count += 1
        else:
            # print(f"i: {i} current_number: {current_number}")
            # print(f"number: {number} {sequence} {current_streak_count}")
            if current_streak_number not in numbers["dimensions"][0]:
                numbers["dimensions"][0][current_streak_number] = {current_streak_count:{"prev": -1, "next": -1,
                                                                    "next_dimension_parent": ["dimensions", 1, current_streak_count, 1]}}
            else:
                numbers["dimensions"][0][current_streak_number][current_streak_count] = {"prev": -1, "next": -1,
                                                                    "next_dimension_parent": ["dimensions", 1, current_streak_count, 1]}
            if current_streak_count not in numbers["dimensions"][1]:
                numbers["dimensions"][1][current_streak_count] = {1: {"prev": -1, "next": -1,
                                                            "next_dimension_parent": [],
                                                            "next_dimension_children": [["dimensions", 0, current_streak_number, current_streak_count]]}}
            else:
                numbers["dimensions"][1][current_streak_count][1]["next_dimension_children"].append(["dimensions", 0, current_streak_number, current_streak_count])
            current_streak_number = number
            current_streak_count = 1
            
    for key, value in numbers.items():
        print(key)
        [print(f"{key} {value}") for key, value in value.items()]
        print("\n")
    # print(f"{findDifferentSequenceSameStreakNumber([1, 1, 1], numbers)}")
    # print(f"{i} {numbers} {prediction_order_number} {successful_prediction}")


def findStableNumber(sequence):

    current_number = sequence[0]
    same_count = 0
    stable_numbers = []
    for number in sequence:
        if number == current_number:
            # print(f"same")
            same_count += 1
            if same_count == 2:
                print(f"{current_number} same for {same_count} times")
                return current_number
        else:
            # print(f"number changed")
            current_number = number
            same_count = 1
def x18():

    sequence1 = [1, 1, 3, 3, 2, 2]
    sequence2 = [1, 2, 2, 2, 1, 1]

    current_number_s1 = sequence1[0]
    same_count_s1 = 0
    current_number_s2 = sequence2[0]
    same_count_s2 = 0
    new_sequence = []
    for s1, s2 in zip(sequence1, sequence2):
        if s1 == current_number_s1:
            same_count_s1 += 1
        else:
            current_number_s1 = s1
            same_count_s1 = 1
        if s2 == current_number_s2:
            same_count_s2 += 1
        else:
            current_number_s2 = s2
            same_count_s2 = 1
        # print(f"s1: {s1} | {same_count_s1} | s2: {s2} | {same_count_s2}")
        if same_count_s1 >= 2 and same_count_s2 >= 2:
            new_sequence.insert(0, 2)
            print(f"stable numbers {current_number_s1} and {current_number_s2}")
        # print()

    print(new_sequence)

def findStableNumbers(sequences):

    same_counts = [0 for _ in range(len(sequences))]
    current_numbers = [sequences[0] for _ in range(len(sequences))]

    new_sequence = []
    for items in zip(*sequences):
        for i, item in enumerate(items):
            if item == current_numbers[i]:
                same_counts[i] += 1
            else:
                current_numbers[i] = item
                same_counts[i] = 1
        counts = len([True for count in same_counts if count >= 2])
        if counts >= 2:
            new_sequence.insert(0, counts)
            print(f"stable numbers {items}")
    return new_sequence

def findStableNumbers2(levels, pipe_ids):    
    pass

def addSequence(levels, level_id, sequence, pipe_id):

    prev_pipe_count = -1
    prev_pipe_count_id = -1
    for i, pipe_count in enumerate(sequence):

        # print(f"before: {prev_pipe_count} {prev_pipe_count_id}")
        if pipe_id not in levels[level_id]["pipes"]:
            levels[level_id]["pipes"][pipe_id] = {"pipe_counts": {}}
        if pipe_count not in levels[level_id]["pipes"][pipe_id]["pipe_counts"]:
            levels[level_id]["pipes"][pipe_id]["pipe_counts"][pipe_count] = {"pipe_count_ids": {0: {"next": []}}}
            if prev_pipe_count != -1 and prev_pipe_count_id != -1:
                    levels[level_id]["pipes"][pipe_id]["pipe_counts"][prev_pipe_count]["pipe_count_ids"][prev_pipe_count_id]["next"] = [level_id, pipe_id, pipe_count, 0]
            prev_pipe_count_id = 0
        else:
            new_pipe_count_id = len(levels[level_id]["pipes"][pipe_id]["pipe_counts"][pipe_count]["pipe_count_ids"])
            levels[level_id]["pipes"][pipe_id]["pipe_counts"][pipe_count]["pipe_count_ids"][new_pipe_count_id] = {"next": []}
            levels[level_id]["pipes"][pipe_id]["pipe_counts"][prev_pipe_count]["pipe_count_ids"][prev_pipe_count_id]["next"]= [level_id, pipe_id, pipe_count, new_pipe_count_id]
            prev_pipe_count_id = new_pipe_count_id
        prev_pipe_count = pipe_count
        # print(f"after : {prev_pipe_count} {prev_pipe_count_id}")
        # print()


def visitSequence(levels, level_id, pipe_id, pipe_count, pipe_count_id):

    tracker = [level_id, pipe_id, pipe_count, pipe_count_id]
    # print(f"{pipe_count}")
    tracker_item = getItem(levels, tracker)
    # counter = 0
    pipe_items = []
    pipe_items.append(pipe_count)
    while len(tracker_item["next"]) > 0:
        # print(counter)
        # if counter > 10:
        #     break
        # print(f"{level_id} {pipe_id} {pipe_count} {pipe_count_id} {tracker_item['next']}")
        level_id, pipe_id, pipe_count, pipe_count_id = tracker_item["next"]
        pipe_items.append(pipe_count)
        tracker = [level_id, pipe_id, pipe_count, pipe_count_id]
        tracker_item = getItem(levels, tracker)
        # counter += 1
    print(f"{pipe_items}")


def getItem(levels, tracker):

    level_id, pipe_id, pipe_count, pipe_count_id = tracker
    return levels[level_id]["pipes"][pipe_id]["pipe_counts"][pipe_count]["pipe_count_ids"][pipe_count_id]
def x19():

    sequence1 = [1, 1, 3, 3, 2, 2, 1, 1, 5, 5, 2, 2]
    sequence2 = [1, 2, 2, 1, 1, 1, 1, 1, 2, 2, 1, 1]
    sequence3 = [4, 4, 6, 6, 1, 1, 4, 4, 5, 6, 1, 1]
    sequence4 = [1, 2, 3, 3, 1, 1, 1, 1, 3, 3, 1, 1]

    levels = {  1: {"pipes": [[sequence1, sequence2],
                                [sequence3, sequence4]]},
                2: {"pipes": [[], []]},
                3: {"pipes": []}}
    levels2 = {0: {"pipes": {}}}

    addSequence(levels=levels2, level_id=0, sequence=sequence1, pipe_id=0)
    addSequence(levels=levels2, level_id=0, sequence=sequence2, pipe_id=1)
    addSequence(levels=levels2, level_id=0, sequence=sequence3, pipe_id=2)
    addSequence(levels=levels2, level_id=0, sequence=sequence4, pipe_id=3)
    # addSequence(levels2, 0, sequence3, 2)
    # addSequence(levels2, 0, sequence4, 3)

    visitSequence(levels=levels2, level_id=0, pipe_id=0, pipe_count=1, pipe_count_id=0)
    visitSequence(levels=levels2, level_id=0, pipe_id=1, pipe_count=1, pipe_count_id=0)
    visitSequence(levels=levels2, level_id=0, pipe_id=2, pipe_count=4, pipe_count_id=0)
    visitSequence(levels=levels2, level_id=0, pipe_id=3, pipe_count=1, pipe_count_id=0)

    # [print(key, value) for key, value in levels2.items()]

    # levels[2]["pipes"][0] = findStableNumbers([levels[1]["pipes"][0][0], levels[1]["pipes"][0][1]])
    # print()
    # levels[2]["pipes"][1] = findStableNumbers([levels[1]["pipes"][1][0], levels[1]["pipes"][1][1]])
    # print()

    # levels[3]["pipes"] = findStableNumbers([levels[2]["pipes"][0], levels[2]["pipes"][1]])

    # [print(key, value) for key, value in levels.items()]

def makeSequence(trie, sequence):

    visited = {}
    tracker = trie
    for i, item in enumerate(sequence):

        # print(f"{i} {item} {visited} | {tracker} | {trie}")
        if item in visited:
            tracker = trie
            visited = {}
            if item in tracker:
                tracker[item]["visited_count"] += 1
            if item not in tracker:
                tracker[item] = {"visited_count": 1}
                visited[item] = True
                tracker = tracker[item]
            continue
        if item not in tracker:
            tracker[item] = {"visited_count": 1}
            visited[item] = True
        tracker = tracker[item]


def pruneTrie(trie, histogram=None):

    import copy
    # print(f"{trie} {histogram}")
    if "visited_count" in trie and len(trie) == 1:
        # print("remove")
        # return
        y = [(key, value) for key, value in histogram.items()]
        y.sort(key=lambda x: x[1], reverse=False)
        # print(y)
        return y[0][0]
    numeric_keys = [key for key in trie if key != "visited_count"]
    for i, key in enumerate(numeric_keys):

        value = trie[key]
        if i == 0:
            histogram[key] = value["visited_count"]
            remove_item = pruneTrie(value, histogram)
        if i > 0:
            new_histogram = copy.deepcopy(histogram)
            remove_item = pruneTrie(value, new_histogram)
        # print(f"remove {remove_item}")
        # print(f"{key}, {value}, {trie}")
        if remove_item == key:
           nested_trie = {}
           for nested_key in value:
               if nested_key != "visited_count":
                   nested_trie[nested_key] = value[nested_key]
           del trie[key]
           for nested_key2 in nested_trie:
               trie[nested_key2] = nested_trie

def x20():

    sequences = [[1, 1], [1, 1], [2, 2], [1, 1], [1, 1], [3, 3], [3, 3], [1, 1], [3, 3]]

    leaf_numbers = []
    for i, sequence in enumerate(sequences):
        trie = {}
        makeSequence(trie, sequence)
        leaf_numbers.append(list(trie.keys())[0])
        # print(trie)
    # print(leaf_numbers)

    trie2 = {}
    makeSequence(trie2, leaf_numbers)
    print(trie2)
    pruneTrie(trie2, {})
    print(trie2)
    

x20()