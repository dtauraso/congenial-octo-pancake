def getPoint(lines, tracker):
    return lines[tracker["line"]][tracker["point"]]

def x21():

    import copy
    # [1, 2, 3, 1, 3, 2]
    # [1, 2, 3, 1, 3, 2, 4, 3]
    sequence1 = [1, 2, 3, 4, 2, 3, 5, 2, 3, 1]

    lines = {}

    retrace_step_count = 0
    predictions = []
    prev_point = {"line": 0, "point": 0}
    prev_prev_point = {"line": 0, "point": 0}
    for i, current_line in enumerate(sequence1):
        prev_successful_predictions = copy.deepcopy(predictions)
        predictions = [
                        {"first_prev_point": prediction["first_prev_point"],
                        "prediction": {"line": getPoint(lines, prediction["prediction"])["next_line"],
                                       "point": getPoint(lines, prediction["prediction"])["next_point"]}}            
                            for prediction in predictions
                                if getPoint(lines, prediction["prediction"])["next_line"] == current_line]
        if len(predictions) == 0:
            if len(prev_successful_predictions) > 0:
                if retrace_step_count > 1:
                    retrace_step_count = 0
                    first_prev_point = prev_successful_predictions[0]["first_prev_point"]
                    end_point = prev_successful_predictions[0]["prediction"]
                    if "parents" not in lines[prev_point["line"]][prev_point["point"]]:
                        pattern_number = len(lines) * -1
                        lines[pattern_number] = {0: {"prev_line": first_prev_point["line"],
                                                    "prev_point": first_prev_point["point"],
                                                    "next_line": lines[end_point["line"]][end_point["point"]]["next_line"],
                                                    "next_point": lines[end_point["line"]][end_point["point"]]["next_point"],
                                                    "start_child": {"line": prev_point["line"], "point": prev_point["point"]},
                                                    "end_child": {"line": end_point["line"], "point": end_point["point"]}},
                                                1: {"prev_line": prev_prev_point["line"], "prev_point": prev_prev_point["point"],
                                                    "next_line": 0, "next_point": 0,
                                                    "start_child": {"line": prev_point["line"], "point": prev_point["point"]},
                                                    "end_child": {"line": end_point["line"], "point": end_point["point"]}}}
                        lines[first_prev_point["line"]][first_prev_point["point"]]["next_line"] = pattern_number
                        lines[first_prev_point["line"]][first_prev_point["point"]]["next_point"] = 0
                        lines[prev_prev_point["line"]][prev_prev_point["point"]]["next_line"] = pattern_number
                        lines[prev_prev_point["line"]][prev_prev_point["point"]]["next_point"] = 1
                        lines[end_point["line"]][end_point["point"]]["next_line"] = 0
                        lines[end_point["line"]][end_point["point"]]["next_point"] = 0
                        lines[prev_point["line"]][prev_point["point"]]["parents"] = [{"line": pattern_number, "point": 0}, {"line": pattern_number, "point": 1}]
                        lines[end_point["line"]][end_point["point"]]["parents"] = [{"line": pattern_number, "point": 0}, {"line": pattern_number, "point": 1}]
                        prev_point["point"] = 1
                    else:
                        parent_number = [parent["line"] for parent in lines[prev_point["line"]][prev_point["point"]]["parents"]][0]
                        lines[prev_prev_point["line"]][prev_prev_point["point"]]["next_line"] = parent_number
                        lines[prev_prev_point["line"]][prev_prev_point["point"]]["next_point"] = len(lines[parent_number])
                        lines[parent_number][len(lines[parent_number])] = {
                                                    "prev_line": prev_prev_point["line"], "prev_point": prev_prev_point["point"],
                                                    "next_line": 0, "next_point": 0,
                                                    "start_child": {"line": prev_point["line"], "point": prev_point["point"]},
                                                    "end_child": {"line": end_point["line"], "point": end_point["point"]}}
                        prev_point["point"] = len(lines[parent_number])-1
                    prev_point["line"] = pattern_number
                if retrace_step_count == 1:
                    retrace_step_count = 0
                    lines[prev_point["line"]][len(lines[prev_point["line"]])] = {"prev_line": prev_prev_point["line"], "prev_point": prev_prev_point["point"], "next_line": 0, "next_point": 0}
                    if current_line in lines:
                        lines[current_line][len(lines[current_line])] = {"prev_line": prev_point["line"], "prev_point": len(lines[prev_point["line"]])-1, "next_line": 0, "next_point": 0}
                        lines[prev_prev_point["line"]][prev_prev_point["point"]]["next_line"] = prev_point["line"]
                        lines[prev_prev_point["line"]][prev_prev_point["point"]]["next_point"] = len(lines[prev_point["line"]])-1
                        lines[prev_point["line"]][len(lines[prev_point["line"]])-1]["next_line"] = current_line
                        lines[prev_point["line"]][len(lines[prev_point["line"]])-1]["next_point"] = len(lines[current_line])-1
                        prev_prev_point = {"line": prev_point["line"], "point": len(lines[prev_point["line"]])-1}                
                        prev_point["line"] = current_line
                        prev_point["point"] = len(lines[current_line])-1

            else:
                if retrace_step_count == 0:
                    if i == len(sequence1)-1:
                        lines[current_line][len(lines[current_line])] = {"prev_line": prev_point["line"], "prev_point": prev_point["point"], "next_line": 0, "next_point": 0}
                        lines[prev_point["line"]][prev_point["point"]]["next_line"] = current_line
                        lines[prev_point["line"]][prev_point["point"]]["next_point"] = len(lines[current_line])-1
            if current_line in lines:
                if i == len(sequence1)-1:
                    lines[current_line][len(lines[current_line])] = {"prev_line": prev_point["line"], "prev_point": prev_point["point"], "next_line": 0, "next_point": 0}
                    lines[prev_point["line"]][prev_point["point"]]["next_line"] = current_line
                    lines[prev_point["line"]][prev_point["point"]]["next_point"] = len(lines[current_line])-1
                retrace_step_count = 1
                prev_prev_point = {"line": prev_point["line"], "point": prev_point["point"]}                
                prev_point["line"] = current_line
                prev_point["point"] = len(lines[current_line])-1
                predictions = [
                    {"first_prev_point": {"line": lines[current_line][key]["prev_line"],
                                            "point": lines[current_line][key]["prev_point"]},
                    "prediction": {"line": current_line, "point": key}}
                        for key in lines[current_line]]
            elif current_line not in lines:
                if prev_point["line"] in lines:
                    getPoint(lines, prev_point)["next_line"] = current_line
                    getPoint(lines, prev_point)["next_point"] = 0
                lines[current_line] = {0: {"prev_line": prev_point["line"], "prev_point": prev_point["point"], "next_line": 0, "next_point": 0}}
                prev_point["line"] = current_line
                prev_point["point"] = 0
        else:
            retrace_step_count += 1

    print(f"lines")
    [print(key, value) for key, value in lines.items()]
    print()
    return
    trie = {}
    makeSequence(trie, [i["n"] for i in sequence1])
    # print()
    # [print(key, value) for key, value in trie.items()]
    sequences = [sequence1]
    common_sequence = []
    i = 0
    start = 0
    return 
    for number_1, number_2 in zip(sequence1, sequence2):
        if number_1["n"] == number_2["n"]:
            if len(common_sequence) == 0:
                start = i
            common_sequence.append(number_1)
        else:
            if len(common_sequence) > 0:
                sequences.append(common_sequence)
                common_sequence = []
                sequence1 = sequence1[:start] + [{"n": sequences[-1]}] + sequence1[i:]
                sequence2 = sequence2[:start] + [{"n": sequences[-1]}] + sequence1[i:]
                start = 0
        i += 1

    [print(x) for x in sequence1]
    print()
    [print(x) for x in sequence2]

def x22():

    import copy
    # [1, 2, 3, 1, 3, 2]
    # [1, 2, 3, 1, 3, 2, 4, 3]
    # 2 3 1 10 5
    # 2 3 1 4 5
    # 2 3 1 1 1 4 5
    sequence1 = [1, 2, 3, 4, 2, 3, 5, 2, 3, 1, 1, 1, 2, 4, 5, 6, 4, 5, 7]

    lines = {}

    retrace_step_count = 0
    predictions = []
    prev_point = {"line": 0, "point": 0}
    prev_prev_point = {"line": 0, "point": 0}
    for i, current_line in enumerate(sequence1):
        prev_successful_predictions = copy.deepcopy(predictions)
        predictions = [
                        {"first_prev_point": prediction["first_prev_point"],
                        "prediction": {"line": getPoint(lines, prediction["prediction"])["next_line"],
                                       "point": getPoint(lines, prediction["prediction"])["next_point"]}}            
                            for prediction in predictions
                                if getPoint(lines, prediction["prediction"])["next_line"] == current_line]
        print(f"start i {i} current_line: {current_line} prev_point: {prev_point} prev_prev_point: {prev_prev_point} predictions: {predictions} prev_successful_predictions: {prev_successful_predictions} retrace_step_count: {retrace_step_count}")
        if len(predictions) == 0:
            if len(prev_successful_predictions) > 0:
                if retrace_step_count > 1:
                    first_prev_point = prev_successful_predictions[0]["first_prev_point"]
                    end_point = prev_successful_predictions[0]["prediction"]
                    if not(end_point["line"] == prev_point["line"] and end_point["point"] == prev_point["point"]):
                        retrace_step_count = 0
                        if "parents" not in lines[prev_point["line"]][prev_point["point"]]:
                            pattern_number = len(lines) * -1
                            lines[pattern_number] = {0: {"prev_line": first_prev_point["line"],
                                                        "prev_point": first_prev_point["point"],
                                                        "next_line": getPoint(lines, end_point)["next_line"],
                                                        "next_point": getPoint(lines, end_point)["next_point"],
                                                        "start_child": {"line": prev_point["line"], "point": prev_point["point"]},
                                                        "end_child": {"line": end_point["line"], "point": end_point["point"]}},
                                                    1: {"prev_line": prev_prev_point["line"],
                                                        "prev_point": prev_prev_point["point"],
                                                        "next_line": 0, "next_point": 0,
                                                        "start_child": {"line": prev_point["line"], "point": prev_point["point"]},
                                                        "end_child": {"line": end_point["line"], "point": end_point["point"]}}}
                            getPoint(lines, first_prev_point)["next_line"] = pattern_number
                            getPoint(lines, first_prev_point)["next_point"] = 0
                            lines[prev_prev_point["line"]][prev_prev_point["point"]]["next_line"] = pattern_number
                            lines[prev_prev_point["line"]][prev_prev_point["point"]]["next_point"] = 1
                            lines[end_point["line"]][end_point["point"]]["next_line"] = 0
                            lines[end_point["line"]][end_point["point"]]["next_point"] = 0
                            lines[prev_point["line"]][prev_point["point"]]["parents"] = [{"line": pattern_number, "point": 0}, {"line": pattern_number, "point": 1}]
                            lines[end_point["line"]][end_point["point"]]["parents"] = [{"line": pattern_number, "point": 0}, {"line": pattern_number, "point": 1}]
                            prev_point["point"] = 1
                        else:
                            parent_number = [parent["line"] for parent in lines[prev_point["line"]][prev_point["point"]]["parents"]][0]
                            lines[prev_prev_point["line"]][prev_prev_point["point"]]["next_line"] = parent_number
                            lines[prev_prev_point["line"]][prev_prev_point["point"]]["next_point"] = len(lines[parent_number])
                            lines[parent_number][len(lines[parent_number])] = {
                                                        "prev_line": prev_prev_point["line"], "prev_point": prev_prev_point["point"],
                                                        "next_line": 0, "next_point": 0,
                                                        "start_child": {"line": prev_point["line"], "point": prev_point["point"]},
                                                        "end_child": {"line": end_point["line"], "point": end_point["point"]}}
                            prev_point["point"] = len(lines[parent_number])-1
                        prev_point["line"] = pattern_number
            else:
                if retrace_step_count == 0:
                    if i == len(sequence1)-1:
                        lines[current_line][len(lines[current_line])] = {"prev_line": prev_point["line"], "prev_point": prev_point["point"], "next_line": 0, "next_point": 0}
                        lines[prev_point["line"]][prev_point["point"]]["next_line"] = current_line
                        lines[prev_point["line"]][prev_point["point"]]["next_point"] = len(lines[current_line])-1
            if current_line in lines:
                if retrace_step_count == 1:
                    if prev_point["line"] != prev_prev_point["line"]:
                        print(f"i {i} prev != prev prev current_line: {current_line} prev_point: {prev_point} prev_prev_point: {prev_prev_point} predictions: {predictions} prev_successful_predictions: {prev_successful_predictions} retrace_step_count: {retrace_step_count}")
                        print()

                        lines[prev_point["line"]][len(lines[prev_point["line"]])] = {"prev_line": prev_prev_point["line"], "prev_point": prev_prev_point["point"], "next_line": 0, "next_point": 0}
                        lines[prev_prev_point["line"]][prev_prev_point["point"]]["next_line"] = prev_point["line"]
                        lines[prev_prev_point["line"]][prev_prev_point["point"]]["next_point"] = len(lines[prev_point["line"]])-1

                        # print(f"prev line != prev prev line")
                        prev_prev_point = {"line": prev_point["line"], "point": prev_point["point"]}                
                        prev_point["line"] = current_line
                        prev_point["point"] = len(lines[current_line])-1

                        print(f"lines")
                        [print(key, value) for key, value in lines.items()]
                        print()
                    else: # same line match is a streak of >= 2
                        # print(f"prev line == prev prev line")
                        if current_line != prev_point["line"]: # current line is not on the streak line
                            # print(f"current line != prev line")
                            lines[prev_point["line"]][len(lines[prev_point["line"]])] = {"prev_line": prev_point["line"], "prev_point": prev_point["point"], "next_line": 0, "next_point": 0}
                            lines[prev_point["line"]][prev_point["point"]]["next_line"] = prev_point["line"]
                            lines[prev_point["line"]][prev_point["point"]]["next_point"] = len(lines[prev_point["line"]])-1
                        else:
                            # print(f"current line == prev line")
                            lines[current_line][len(lines[current_line])] = {"prev_line": prev_point["line"], "prev_point": prev_point["point"], "next_line": 0, "next_point": 0}
                            lines[prev_point["line"]][prev_point["point"]]["next_line"] = current_line
                            lines[prev_point["line"]][prev_point["point"]]["next_point"] = len(lines[current_line])-1
                        prev_prev_point = {"line": prev_point["line"], "point": prev_point["point"]}                
                        prev_point["line"] = current_line
                        prev_point["point"] = len(lines[current_line])-1
                        # print(f"lines")
                        # [print(key, value) for key, value in lines.items()]
                        # print()
                else:
                    # print(f"match i {i} current_line: {current_line} prev_point: {prev_point} prev_prev_point: {prev_prev_point} prev_successful_predictions: {prev_successful_predictions} retrace_step_count: {retrace_step_count}")
                    prev_prev_point = {"line": prev_point["line"], "point": prev_point["point"]}                
                    prev_point["line"] = current_line
                    prev_point["point"] = len(lines[current_line])-1
                print(f"i {i} match current_line: {current_line} prev_point: {prev_point} prev_prev_point: {prev_prev_point} predictions: {predictions} prev_successful_predictions: {prev_successful_predictions} retrace_step_count: {retrace_step_count}")
                predictions = [
                    {"first_prev_point": {"line": lines[current_line][key]["prev_line"],
                                            "point": lines[current_line][key]["prev_point"]},
                    "prediction": {"line": current_line, "point": key}}
                        for key in lines[current_line]]
                retrace_step_count = 1
            elif current_line not in lines:
                # if retrace_step_count == 1
                    # use cases assuming current line not in lines
                print(f"current line not in lines")
                if prev_point["line"] in lines:
                    getPoint(lines, prev_point)["next_line"] = current_line
                    getPoint(lines, prev_point)["next_point"] = 0
                lines[current_line] = {0: {"prev_line": prev_point["line"], "prev_point": prev_point["point"], "next_line": 0, "next_point": 0}}
                print(f"lines")
                [print(key, value) for key, value in lines.items()]
                print()
                prev_point["line"] = current_line
                prev_point["point"] = 0
        else:
            retrace_step_count += 1
        print(f"lines")
        [print(key, value) for key, value in lines.items()]
        print()

    # print(f"end current_line: {current_line} prev_point: {prev_point} prev_prev_point: {prev_prev_point} prev_successful_predictions: {prev_successful_predictions} retrace_step_count: {retrace_step_count}")
    lines[current_line][len(lines[current_line])] = {"prev_line": prev_prev_point["line"], "prev_point": len(lines[prev_prev_point["line"]])-1, "next_line": 0, "next_point": 0}
    lines[prev_prev_point["line"]][len(lines[prev_prev_point["line"]])-1]["next_line"] = current_line
    lines[prev_prev_point["line"]][len(lines[prev_prev_point["line"]])-1]["next_point"] = len(lines[current_line])-1

    print(f"lines")
    [print(key, value) for key, value in lines.items()]
    print()

def traceLine(sequence):

    lines = {}
    prev = {"line": 0, "point": 0}
    for i, current_line in enumerate(sequence):
        if current_line not in lines:
            lines[current_line] = {0: {"prev": {"line": prev["line"], "point": prev["point"]}, "next": {"line": 0, "point": 0}}}
        else:
            lines[current_line][len(lines[current_line])] = {"prev": {"line": prev["line"], "point": prev["point"]}, "next": {"line": 0, "point": 0}}
        if prev["line"] in lines:
            lines[prev["line"]][prev["point"]]["next"]["line"] = current_line
            lines[prev["line"]][prev["point"]]["next"]["point"] = len(lines[current_line])-1
        prev["line"] = current_line
        prev["point"] = len(lines[current_line])-1
    return lines


def findPointWithParent(line):
    for point in line:
        if "parent" in point:
            return point
    return None
def foldPatterns(lines):

    line_ids = list(lines.keys())
    for i, line_id in enumerate(line_ids):
        match = findPointWithParent(lines[line_id])
        if match == None:
            tracker = {"line": line_id, "point": 0}
            tracker2 = {"line": line_id, "point": 1}
            prev = getPoint(lines, tracker)["prev"]
            prev2 = getPoint(lines, tracker2)["prev"]
            next = getPoint(lines, tracker)["next"]
            next2 = getPoint(lines, tracker2)["next"]
            new_line_id = len(lines) * -1
            lines[new_line_id] = {0: {"prev": {}, "next": {}, "children": {"start": {}, "end": {}}}}
            new_line_tracker = {"line": new_line_id, "point": 0}
            pass
        else:
            for j, point in enumerate(lines[line_id]):
                if point != match:
                    pass
    return lines
def x23():

    sequence1 = [1, 8, 6, 4, 2, 12, 5, 10, 3, 2, 11, 13, 3, 54]

    lines = traceLine(sequence1)

    print(f"lines")
    [print(key, value) for key, value in lines.items()]
    print()
        
x23()