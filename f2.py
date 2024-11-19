def getPoint(lines, tracker):
    if tracker == None:
        return None
    if tracker["line"] in lines:
        if tracker["point"] in lines[tracker["line"]]:
            return lines[tracker["line"]][tracker["point"]]
    else:
        return None

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

    lines = {0:{}}
    prev = {"line": 0, "point": 0}
    for i, current_line in enumerate(sequence):
        if current_line not in lines[0]:
            lines[0][current_line] = {0: {"prev": {"line": prev["line"], "point": prev["point"]}, "next": {"line": 0, "point": 0}}}
        else:
            lines[0][current_line][len(lines[0][current_line])] = {"prev": {"line": prev["line"], "point": prev["point"]}, "next": {"line": 0, "point": 0}}
        if prev["line"] in lines[0]:
            lines[0][prev["line"]][prev["point"]]["next"]["line"] = current_line
            lines[0][prev["line"]][prev["point"]]["next"]["point"] = len(lines[0][current_line])-1
        prev["line"] = current_line
        prev["point"] = len(lines[0][current_line])-1
    return lines

def removeSingleItems(lines):

    keys = list(lines.keys())
    for i, line in enumerate(keys):
        if len(lines[line]) == 1:
            tracker = {"line": line, "point": list(lines[line].keys())[0]}
            prev = getPoint(lines, tracker)["prev"]
            next = getPoint(lines, tracker)["next"]
            if getPoint(lines, prev) == None:
                getPoint(lines, next)["prev"] = {"line": 0, "point": 0}
            elif getPoint(lines, next) == None:
                getPoint(lines, prev)["next"] = {"line": 0, "point": 0}
            else:    
                getPoint(lines, prev)["next"] = next
                getPoint(lines, next)["prev"] = prev
            del lines[tracker["line"]][tracker["point"]]
            del lines[tracker["line"]]

def makeParentLine(lines, start_end_points):

    for i, start_end_point in enumerate(start_end_points):
        start_point = start_end_point["start"]
        end_point = start_end_point["end"]
        start_point_prev = getPoint(lines, start_point)["prev"]
        end_point_next = getPoint(lines, end_point)["next"]
        new_point = {i:
                        {"prev": {"line": start_point_prev["line"], "point": start_point_prev["point"]},
                        "next": {"line": end_point_next["line"], "point": end_point_next["point"]},
                        "children":
                            {"start": {"line": start_point["line"], "point": start_point["point"]},
                            "end": {"line": end_point["line"], "point": end_point["point"]}}}}
        new_line_id = 0
        if i > 0:
            if "parent" in getPoint(lines, start_point):
                new_line_id = getPoint(lines, start_point)["parent"]["line"]
        else:
            new_line_id = len(lines) * -1
        lines[new_line_id] = new_point
        new_line_tracker1 = {"line": new_line_id, "point": i}

        # print(f"tracker1: {tracker1}")
        # print(f"tracker2: {tracker2}")
        # print(f"prev1: {prev1}")
        # print(f"prev2: {prev2}")
        # print(f"new_line_tracker1: {new_line_tracker1}")
        if getPoint(lines, start_point_prev) != None:
            getPoint(lines, start_point_prev)["next"] = {"line": new_line_tracker1["line"], "point": new_line_tracker1["point"]}
        getPoint(lines, new_line_tracker1)["next"] = {"line": end_point_next["line"], "point": end_point_next["point"]}
        getPoint(lines, end_point)["next"] = {"line": 0, "point": 0}
        getPoint(lines, start_point)["prev"] = {"line": 0, "point": 0}
        getPoint(lines, start_point)["parent"] = {"line": new_line_tracker1["line"], "point": new_line_tracker1["point"]}
        getPoint(lines, end_point)["parent"] = {"line": new_line_tracker1["line"], "point": new_line_tracker1["point"]}
        tracker  = {"line": start_point["line"], "point": start_point["point"]}
        while tracker["line"] != end_point["line"] or tracker["point"] != end_point["point"]:
            if getPoint(lines, tracker) == None:
                break
            getPoint(lines, tracker)["parent"] = {"line": new_line_tracker1["line"], "point": new_line_tracker1["point"]}
            tracker = getPoint(lines, tracker)["next"]

    print(f"lines")
    [print(key, value) for key, value in lines.items()]
    print()
    print()

def findPatternEdges(lines, start_point):

    tracker = {"line": start_point["line"], "point": start_point["point"]}
    while getPoint(lines, tracker) != None:
        print(f"tracker: {tracker}")
        line_id = tracker["line"]
        point_id = tracker["point"]
        print(f"line: {lines[line_id]} len: {len(lines[line_id])}")
        print()

        if len(lines[line_id]) >= 3:
            print(f"line: {line_id}")
            trackers = [{"start": {"line": line_id, "point": point_id},
                         "end": {"line": line_id, "point": point_id}}
                        for point_id in lines[line_id]
                            if "parent" not in lines[line_id][point_id]]
            count = 0
            while len(trackers) > 0:
                if len([tracker for i, tracker in enumerate(trackers) if tracker["end"]["line"] == 0]) > 0:
                    break
                # print(f"trackers: {trackers}")
                trackers = [{"start": tracker["start"],
                            "end": {
                                "line": getPoint(lines, tracker["end"])["next"]["line"],
                                "point": getPoint(lines, tracker["end"])["next"]["point"]}}
                            for i, tracker in enumerate(trackers)]
                # print(f"trackers after: {trackers}")
                count += 1
                finished_trackers = [tracker for i, tracker in enumerate(trackers)
                                        if tracker["end"]["line"] == tracker["start"]["line"]]
                if len(finished_trackers) > 0:
                    if count == 1:
                        print("finished trackers")
                        [print(i, tracker) for i, tracker in enumerate(finished_trackers)]
                        start_end_points = [{"start": finished_trackers[0]["start"],
                                            "end": finished_trackers[-1]["end"]}]
                        makeParentLine(lines, start_end_points)
                    if count > 1:
                        print("finished trackers")
                        [print(i, tracker) for i, tracker in enumerate(finished_trackers)]
                        makeParentLine(lines, finished_trackers)
                    trackers = [{"start": {"line": line_id, "point": point_id},
                                "end": {"line": line_id, "point": point_id}}
                                for point_id in lines[line_id]
                                    if "parent" not in lines[line_id][point_id]]
        tracker = getPoint(lines, tracker)["next"]

def findEndLineId():
    pass

def findPointWithParent(line):
    for point_id in line:
        if "parent" in line[point_id]:
            return point_id
    return None
def foldPatterns(lines, start_point, new_parent_tracker):

    tracker3 = {"line": start_point["line"], "point": start_point["point"]}
    new_line_id_count = 0
    while getPoint(lines, tracker3) != None:
        line_id = tracker3["line"]
        match_point_id = findPointWithParent(lines[line_id])
        if match_point_id == None:
            tracker1 = {"line": line_id, "point": 0}
            tracker = {"line": line_id, "point": 0}
            tracker = getPoint(lines, tracker)["next"]
            while tracker["line"] != line_id:
                if getPoint(lines, tracker) == None:
                    break
                tracker = getPoint(lines, tracker)["next"]

            if getPoint(lines, tracker) == None:
                prev = getPoint(lines, tracker3)["prev"]
                # print(f"prev: {prev}")
                next = getPoint(lines, tracker3)["next"]
                if getPoint(lines, prev) == None:
                    getPoint(lines, next)["prev"] = {"line": 0, "point": 0}
                elif getPoint(lines, next) == None:
                    getPoint(lines, prev)["next"] = {"line": 0, "point": 0}
                else:    
                    getPoint(lines, prev)["next"] = next
                    getPoint(lines, next)["prev"] = prev
                del lines[tracker3["line"]][tracker3["point"]]
                del lines[tracker3["line"]]
                tracker3 = next
                # print(f"lines")
                # [print(key, value) for key, value in lines.items()]
                # print()
                # print(f"tracker3: {tracker3}")

                continue

            tracker2 = {"line": line_id, "point": tracker["point"]}
            prev1 = getPoint(lines, tracker1)["prev"]
            prev2 = getPoint(lines, tracker2)["prev"]
            new_line_id = len(lines) * -1
            lines[new_line_id] = {0:
                                    {"prev": {"line": prev1["line"], "point": prev1["point"]},
                                    "next": {"line": tracker2["line"], "point": tracker2["point"]},
                                    "children": 
                                        {"start": {"line": tracker1["line"], "point": tracker1["point"]},
                                        "end": {"line": prev2["line"], "point": prev2["point"]}}}}
            if new_parent_tracker != None:
                lines[new_line_id][0]["parent"] = {"line": new_parent_tracker["line"], "point": new_parent_tracker["point"]}
            new_line_tracker1 = {"line": new_line_id, "point": 0}

            # print(f"tracker1: {tracker1}")
            # print(f"tracker2: {tracker2}")
            # print(f"prev1: {prev1}")
            # print(f"prev2: {prev2}")
            # print(f"new_line_tracker1: {new_line_tracker1}")
            if getPoint(lines, prev1) != None:
                getPoint(lines, prev1)["next"] = {"line": new_line_tracker1["line"], "point": new_line_tracker1["point"]}
            getPoint(lines, new_line_tracker1)["next"] = {"line": tracker2["line"], "point": tracker2["point"]}
            getPoint(lines, prev2)["next"] = {"line": 0, "point": 0}
            getPoint(lines, tracker1)["parent"] = {"line": new_line_tracker1["line"], "point": new_line_tracker1["point"]}
            getPoint(lines, prev2)["parent"] = {"line": new_line_tracker1["line"], "point": new_line_tracker1["point"]}
            tracker3 = getPoint(lines, new_line_tracker1)["next"]
            new_line_id_count = 1 + foldPatterns(lines, getPoint(lines, {"line": tracker1["line"], "point": tracker1["point"]})["next"], {"line": new_line_id, "point": 0})
            # print()
        else:
            point = getPoint(lines, tracker3)
            if "parent" in point:
                parent_tracker = getPoint(lines, tracker3)["parent"]
                parent = getPoint(lines, parent_tracker)
                end_child_tracker = parent["children"]["end"]
                if end_child_tracker["line"] == tracker3['line'] and end_child_tracker["point"] == tracker3["point"]:
                    tracker3 = getPoint(lines, tracker3)["next"]
                    continue
            print(f"line_id: {tracker3['line']}, match_point_id: {match_point_id}")
            print(f"tracker3")




            if new_parent_tracker != None:
                new_line_id_count = foldPatterns(lines, getPoint(lines, {"line": tracker1["line"], "point": tracker1["point"]})["next"], new_parent_tracker)
                if new_line_id_count == 0:
                    pass
            tracker3 = getPoint(lines, tracker3)["next"]
    return new_line_id_count
            
def groupLines(lines):

    while True:
        current_level = len(lines) - 1
        next_level = current_level + 1
        lines[next_level] = {}

        point_min_count_pattern_threshold = 1
        histogram = {line: len(points)
                        for line, points in lines[current_level].items()
                            if len(points) >= point_min_count_pattern_threshold}
        parent_points = []
        while len(histogram) > 0:
            max_count = max(histogram.values())
            # if max_count == 1:
            #     break
            max_count_lines = [line for line, count in histogram.items() if count == max_count]
            print(f"Line(s) with the highest count: {max_count_lines}")
            new_sequence_line_id = len(max_count_lines) - 1
            lines[next_level][new_sequence_line_id] = {0: {"children": []}}
            parent_points.append({"line": new_sequence_line_id, "point": 0})
            prev = {"line": 0, "point": 0}
            for line_id in max_count_lines:
                point = [point for point in lines[current_level][line_id] if "visited" not in lines[current_level]][0]
                lines[current_level][line_id][point]["visited"] = True
                lines[current_level][line_id][len(lines[current_level][line_id])] = {"prev": {"line": prev["line"], "point": prev["point"]},
                                                        "next": {"line": 0, "point": 0},
                                                        "parent": {"line": new_sequence_line_id, "point": 0}}
                lines[next_level][new_sequence_line_id][0]["children"].append({"line": line_id, "point": len(lines[current_level][line_id])-1})
                if prev["line"] in max_count_lines:
                    getPoint(lines[current_level], prev)["next"] = {"line": line_id, "point": len(lines[current_level][line_id])-1}
                prev["line"] = line_id
                prev["point"] = len(lines[current_level][line_id])-1
                histogram = {line_id: len(points)
                            for line_id, points in lines[current_level].items()
                                if  all("visited" not in lines[current_level][line_id][point_id]
                                        for point_id in points) and
                                    len(points) >= point_min_count_pattern_threshold}
        if len(histogram) == 0:
            break
    for line_id in lines[current_level]:
        points_to_delete = [point for point in lines[current_level][line_id] if "visited" in lines[current_level][line_id][point]]
        for point in points_to_delete:
            del lines[current_level][line_id][point]
    # print(f"parent_points: {parent_points}")
    # print()

def x221(lines):

    different_line_count_threshold = 1
    for line_id in lines[0].keys():
        print(f"line_id: {line_id}")
        different_line_count = len({lines[0][line_id][point]["next"]["line"]
                                        for point in lines[0][line_id]
                                            if "next" in lines[0][line_id][point] and
                                                lines[0][line_id][point]["next"]["line"] != line_id and
                                                lines[0][line_id][point]["next"]["line"] != 0})
        print(f"different_line_count: {different_line_count}")
        if different_line_count >= different_line_count_threshold:
            print(f"remove points from line_id: {line_id}")
            print(f"points in line_id: {len(lines[0][line_id])}")
            print(f"points in line_id / different_line_count: {len(lines[0][line_id]) / different_line_count}")            

def x222(lines, sequence):


    prev = {"line": 0, "point": 0}
    visited = {}
    points_added = []
    predictions = []
    if sequence[0] in lines[0]:
        predictions = [{"line": sequence[0], "point": point}
                            for point in lines[0][sequence[0]]
                            if "parent" in lines[0][sequence[0]][point]]
    preidction_successful = False
    for i, current_line in enumerate(sequence):
        if i == len(sequence) - 1 and current_line in [p["line"] for p in predictions]:
            preidction_successful = True
        if current_line not in lines[0]:
            lines[0][current_line] = {0: {  "prev": {"line": prev["line"], "point": prev["point"]},
                                            "next": {"line": 0, "point": 0},
                                            "i": i}}
            points_added.append({"line": current_line, "point": 0})
            if prev["line"] in lines[0]:
                lines[0][prev["line"]][prev["point"]]["next"]["line"] = current_line
                lines[0][prev["line"]][prev["point"]]["next"]["point"] = 0
            prev["point"] = 0
        
        else:
            lines[0][current_line][len(lines[0][current_line])] = { "prev": {"line": prev["line"], "point": prev["point"]},
                                                                    "next": {"line": 0, "point": 0},
                                                                    "i": i}
            points_added.append({"line": current_line, "point": len(lines[0][current_line])-1})
            if prev["line"] in lines[0]:
                lines[0][prev["line"]][prev["point"]]["next"]["line"] = current_line
                lines[0][prev["line"]][prev["point"]]["next"]["point"] = len(lines[0][current_line])-1
            prev["point"] = len(lines[0][current_line])-1

        predictions = [getPoint(lines[0], point)["next"]
            for point in predictions
                if  point["line"] == current_line and
                    point["line"] != 0]

        prev["line"] = current_line
        visited[current_line] = 1 if current_line not in visited else visited[current_line]+1
    if preidction_successful:
        for point in points_added:
            del lines[0][point["line"]][point["point"]]
    else:
        if 1 not in lines:
            lines[1] = {}
        parent_line_id = max(visited.values()) if all(value == list(visited.values())[0]
                                                        for value in visited.values()) == True else min(visited.values())
        parent_point_id = 0
        if parent_line_id not in lines[1]:
            lines[1][parent_line_id] = {parent_point_id: {"children": points_added}}
        elif parent_line_id in lines[1]:
            parent_point_id = len(lines[1][parent_line_id])
            lines[1][parent_line_id][parent_point_id] = {"children": points_added}
        for point in points_added:
            lines[0][point["line"]][point["point"]]["parent"] = {"line": parent_line_id, "point": parent_point_id}

def x223(lines, sequence):

    line_counts = {line_id: len(lines[0][line_id]) for line_id in sequence}

    min_line_count = min(line_counts.values())
    min_line_counts = [line_id for line_id, value in line_counts.items() if value == min_line_count]

    print(f"min_line_count: {min_line_count}")
    min_count_line_parent = [{  "min_count_line": {"min_count": min_line_count, "level": 0, "line": {"line": line_id, "point": point_id}},
                                "parent": {"level": 1, "line": getPoint(lines[0], {"line": line_id, "point": point_id})["parent"]}}
                                for line_id in min_line_counts for point_id in lines[0][line_id] ]
    parents = {item["parent"]["line"]["line"]: item["parent"]["line"]["point"] for item in min_count_line_parent}

    print(f"parents:")
    [print(parent_line_id, parent_point_id) for parent_line_id, parent_point_id in parents.items()]
    print()
    x = min_count_line_parent + [
                {  "min_count_line": {"min_count": min_line_count, "level": 0, "line": {"line": child["line"], "point": child["point"]}},
                                "parent": {"level": 1, "line": getPoint(lines[0], {"line": child["line"], "point": child["point"]})["parent"]}}
                for item in min_count_line_parent
                for child in lines[item["parent"]["level"]][item["parent"]["line"]["line"]][item["parent"]["line"]["point"]]["children"]
                if len(lines[0][child["line"]]) == min_line_count and child["line"] != item["min_count_line"]["line"]["line"]]
    print(f"x:")
    [print(min_count_line) for min_count_line in x]
    print()

    # print(f"min_count_line_parent:")
    # [print(min_count_line) for min_count_line in min_count_line_parent]
    # print()

    intersected_lines = {child["line"]: True
                             for item in x
                             for child in lines[item["parent"]["level"]][item["parent"]["line"]["line"]][item["parent"]["line"]["point"]]["children"]
                             if child["line"] != item["min_count_line"]["line"]["line"]}
    print(f"intersected_lines: {intersected_lines}")
    print()

def repartitionParentsWithOverlappingChildLines(lines):
    
    min_line_count = min(len(lines[0][line_id]) for line_id in lines[0])
    print(f"min_line_count: {min_line_count}")
    min_count_line_ids = [line_id for line_id in lines[0] if len(lines[0][line_id]) == min_line_count]

    print(f"min_count_line_ids: {min_count_line_ids}")
    
    parent_points = [lines[0][line_id][0]["parent"] for line_id in min_count_line_ids]

    print(f"parent_line_ids: {parent_points}")
    
    parent_dict = {}
    for parent_point in parent_points:
        if parent_point["line"] not in parent_dict:
            parent_dict[parent_point["line"]] = {parent_point["point"]: [child for child in lines[1][parent_point["line"]][parent_point["point"]]["children"]
                                                                                    if child["line"] in min_count_line_ids]}
        else:
            parent_dict[parent_point["line"]][parent_point["point"]] = [child for child in lines[1][parent_point["line"]][parent_point["point"]]["children"]
                                                                                    if child["line"] in min_count_line_ids]
    print(f"parent_dict: {parent_dict}")
    parent_min_count_child_list = []
    for parent_line_id in parent_dict:
        for parent_point_id in parent_dict[parent_line_id]:
            parent_min_count_child_list.append({"parent": {"line": parent_line_id, "point": parent_point_id}, "children": []})
            for child_point in parent_dict[parent_line_id][parent_point_id]:
                if child_point["line"] in min_count_line_ids:
                    parent_min_count_child_list[-1]["children"].append(child_point)

    print(f"parent_min_count_child_list:")
    [print(item) for item in parent_min_count_child_list]
    print(f"len(parent_min_count_child_list): {len(parent_min_count_child_list)}")
    print()

    min_count_children = [child for item in parent_min_count_child_list for child in item["children"]]

    x = [{"parent": {   "line": item["parent"]["line"], "point": item["parent"]["point"]},
                        "children": [item["children"], [{"line": child["line"], "point": child["point"]}
                                                            for child in [y for y in lines[1][item["parent"]["line"]][item["parent"]["point"]]["children"]]
                                                                if child["line"] not in [x["line"] for x in min_count_children]]]}
                        for item in parent_min_count_child_list]
    print(f"x:")
    [print(item) for item in x]
    print()
    print(f"min_count_children:")
    [print(item) for item in min_count_children]
    print()

    y = [{"parent": {   "line": item["parent"]["line"], "point": item["parent"]["point"]},
                            "children": [children_group
                                for children_group in item["children"]
                                    if any(True for child in children_group
                                        if child["line"] in [x["line"] for x in min_count_children])]}
                            for item in x]

    print(f"y:")
    [print(item) for item in y]
    print()

    z = [{"line": child, "point": child_point_id}
                for child in lines[0]
                    for child_point_id in lines[0][child]
                    if child not in [x["line"] for x in min_count_children]]
    print(f"z:")
    [print(item) for item in z]
    print()

   
    for i, item in enumerate(y):
        parent_point = item["parent"]
        del lines[1][parent_point["line"]][parent_point["point"]]
        for child_group in item["children"]:
            for child_point in child_group:
                del lines[0][child_point["line"]][child_point["point"]]["parent"]
                lines[0][child_point["line"]][child_point["point"]]["parent"] = {"line": 1, "point": i}
            lines[1][1][i] = {"children": child_group}

    for item in z:
        lines[0][item["line"]][item["point"]]["parent"] = {"line": 1, "point": 2}

    lines[1][1][2] = {"children": z}

def completeNewPartialSequence(lines, partial_sequence):

    from functools import reduce
    match_key_line = 0
    match_key_point = 0
    match_i = 0
    print(f"partial_sequence: {partial_sequence}")
    for i, item in enumerate(partial_sequence):
        if item in lines[0] and i in [lines[0][item][x]["i"] for x in lines[0][item]]:
            match_key_line = item
            match_key_point = len(lines[0][item])-1
            match_i = i
            break
    print(f"match_key_line: {match_key_line}")
    print(f"match_key_point: {match_key_point}")
    print(f"match_i: {match_i}")
    print(f"lines[0][match_key_line]: {lines[0][match_key_line]}")
    print()
    tracker = {"line": lines[0][match_key_line][0]["prev"]["line"], "point": lines[0][match_key_line][0]["prev"]["point"]}
    line_new_number_map = {}
    non_matched_points = []
    for i in reversed(range(0, match_i)):
        if tracker["line"] == 0 and tracker["point"] == 0:
            break
        line_new_number_map[tracker["line"]] = partial_sequence[i]
        non_matched_points.append({"line": tracker["line"], "point": tracker["point"]})
        tracker = lines[0][tracker["line"]][tracker["point"]]["prev"]
    print(f"line_new_number_map: {line_new_number_map}")
    print()
    non_matched_line_parent = reduce(lambda x: x, [lines[0][x["line"]][x["point"]]["parent"]
                                    for x in non_matched_points])

    print(f"non_matched_line_parent: 'level': 1, {non_matched_line_parent}")
    print()
    matched_parent = lines[0][match_key_line][match_key_point]["parent"]
    print(f"matched_parent: 'level': 1, {matched_parent}")
    print()
    tracker2 = {"line": match_key_line, "point": match_key_point}
    tracker2 = lines[0][tracker2["line"]][tracker2["point"]]["next"]
    remaining_sequence = []
    while tracker2["line"] > 0:
        if tracker2["line"] in line_new_number_map:
            remaining_sequence.append(line_new_number_map[tracker2["line"]])
        else:
            remaining_sequence.append(tracker2["line"])
        tracker2 = lines[0][tracker2["line"]][tracker2["point"]]["next"]
    print()
    print(f"remaining_sequence: {remaining_sequence}")
    print()
    sequence = partial_sequence + remaining_sequence
    print(f"sequence: {sequence}")
    print()

def groupColumns(lines):


    [print(line_id) for line_id in lines]
    histogram2 = {line_id: sum(1 for point in points
                                        if "next" in lines[line_id][point] and
                                            lines[line_id][point]["next"]["line"] != line_id)
                                        for line_id, points in lines.items() if line_id > 0}
    print(f"histogram2")
    [print(key, value) for key, value in histogram2.items()]
    
    
    grouped_lines = {count: [line for line, c in histogram2.items() if c == count]
                        for count in set(histogram2.values())}

    print("Grouped lines by histogram count:")
    for count, lines1 in grouped_lines.items():
        print(f"Count {count}: Lines {lines1}")
        if len(lines1) > 1:
            print(f"lines1: {lines1}")
    # makeParentLine(lines, start_end_points)

    print()

def x23():
    # 1, 2, 1, 3, 1, 24, 4, 1, 5, 6, 2, 67, 6, 3, 6, 4, 6, 5, 23, 2, 23, 3, 23, 4, 23, 5
    # 1, 2, 1, 3, 1, 4, 1, 5
    # 1, 2, 3, 2, 3, 1, 3, 2, 1
    # 1, 2, 3
    # 1, 2, 1, 3, 1, 4, 1, 5
    sequence1 = [1, 2, 1, 3, 1, 4, 1, 5]

    # lines = traceLine(sequence1)

    # for key in lines: nmj
    #     print(key)
    #     [print(key, value) for key, value in lines[key].items()]
    # print()
    # groupColumns(lines)
    # groupLines(lines)
    # x221(lines)
    lines = {0: {}}
    x222(lines, sequence1)
    # for key in lines:
    #     print(key)
    #     [print(key, value) for key, value in lines[key].items()]
    # print()
    # exit()
    # print()
    # sequence1 = [1, 2, 3]
    # x222(lines, sequence1)
    # sequence1 = [1, 2, 3]
    # x222(lines, sequence1)
    # exit()
    # print()
    # sequence1 = [2, 3, 4, 5]
    # x222(lines, sequence1)
    # sequence1 = [2, 3, 4, 5]
    # x222(lines, sequence1)
    # for key in lines:
    #     print(key)
    #     [print(key, value) for key, value in lines[key].items()]
    # print()
    repartitionParentsWithOverlappingChildLines(lines)
    partial_sequence1 = [2, 2]
    completeNewPartialSequence(lines, partial_sequence1)
    # sequence2 = [1, 2]
    # x223(lines, sequence2)
    # sequence2 = [1, 4]
    # x223(lines, sequence2)
    # findPatternEdges(lines, {"line": 2, "point": 0})
    # removeSingleItems(lines)
    # foldPatterns(lines, {"line": 1, "point": 0}, None)
    print(f"lines")
    for key in lines:
        print(key)
        [print(key, value) for key, value in lines[key].items()]
    print()


class Point():

    def __init__(self, top=None, bottom=None, prev=None, next=None, parent=None, children=[], line_ref=None, order_id=0, is_expected=False, expected_sequence_length=0):
        self.top = top
        self.bottom = bottom
        self.prev = prev
        self.next = next
        self.parent = parent
        self.children = children
        self.children_match_count = 0
        self.current_count = 0
        self.same_count_points = []
        self.point_expectation_status_transfered_from = None
        self.is_expected = is_expected
        self.expected_sequence_length = expected_sequence_length
        self.line_ref = line_ref
        self.order_id = order_id
    def __str__(self):
        return f"(point id: {id(self)}, next: {self.next}, is_expected: {self.is_expected}, order_id: {self.order_id}, line id: {self.line_ref.id})"
    def getCount(self, level_id=0):
        if level_id == 0:
            if self.top is None and self.bottom is None:
                self.current_count = 1
            elif self.bottom is None and self.top is not None:
                current_count = self.top.getCount(level_id + 1) + 1
                self.sendCount(current_count, level_id + 1)
                self.current_count = current_count
            elif self.bottom is not None and self.top is None:
                current_count = self.bottom.getCount(level_id - 1) + 1
                self.sendCount(current_count, level_id - 1)
                self.current_count = current_count
            elif self.bottom is not None and self.top is not None:
                current_count = self.top.getCount(level_id + 1) + self.bottom.getCount(level_id - 1) + 1
                self.sendCount(current_count, level_id + 1)
                self.sendCount(current_count, level_id - 1)
                self.current_count = current_count
        if level_id > 0:
            return 1 if self.top is None else self.top.getCount(level_id + 1) + 1
        elif level_id < 0:
            return 1 if self.bottom is None else self.bottom.getCount(level_id - 1) + 1

    def sendCount(self, count, level_id=0):
        self.current_count = count
        if level_id > 0:
            if self.top is not None:
                self.top.sendCount(count, level_id + 1)
        elif level_id < 0:
            if self.bottom is not None:
                self.bottom.sendCount(count, level_id - 1)
    def matchCount(self, count):
        return self.current_count == count
    def findPointsOnOtherLinesWithSameCount(self, current_count, level_id=0):
        if level_id == 0:
            if self.next is None and self.prev is None:
                if self.matchCount(current_count):
                    self.same_count_points = [id(self)]
                else:
                    return []
            elif self.next is None and self.prev is not None:
                if self.matchCount(current_count):
                    same_count_points = [id(self)] + self.prev.findPointsOnOtherLinesWithSameCount(current_count, level_id + 1)
                    self.same_count_points = same_count_points
                    return same_count_points
                else:
                    return []
            elif self.next is not None and self.prev is None:
                if self.matchCount(current_count):
                    same_count_points = [id(self)] + self.next.findPointsOnOtherLinesWithSameCount(current_count, level_id - 1)
                    self.same_count_points = same_count_points
                    return same_count_points
                else:
                    return []
            elif self.next is not None and self.prev is not None:
                if self.matchCount(current_count):
                    same_count_points = [id(self)] + self.prev.findPointsOnOtherLinesWithSameCount(current_count, level_id + 1) + self.next.findPointsOnOtherLinesWithSameCount(current_count, level_id - 1)
                    self.same_count_points = same_count_points
                    return same_count_points
                else:
                    return []
        elif level_id > 0:
            same_count_points = []
            if self.matchCount(current_count):
                same_count_points = [id(self)]
            if self.prev is not None:
                return same_count_points + self.prev.findPointsOnOtherLinesWithSameCount(current_count, level_id + 1)
            else:
                return same_count_points
        elif level_id < 0:
            same_count_points = []
            if self.matchCount(current_count):
                 same_count_points = [id(self)]
            if self.next is not None:
                return same_count_points + self.next.findPointsOnOtherLinesWithSameCount(current_count, level_id - 1)
            if self.next is None:
                return same_count_points
    def isExpectedChild(self):
        if self.children_match_count < len(self.children):
            return False
        elif self.children_match_count == len(self.children):
            return True
    def isExpected(self, i=None):
        if self.is_expected:
            # if self.next is not None:
            return True
            # else:
            #     return self.parent.setExpectedChild()
        # elif self.order_id == i:
        #         pass
        else:  
            if self.top is not None:
                return self.top.isExpected()
            else:
                return False
    def removeExpectedPoints(self):
        if self.is_expected:
            self.is_expected = False
        else:  
            if self.top is not None:
                self.top.removeExpectedPoints()
    def removeNextExpectedPoints(self):
        if self.next is not None:
            if self.is_expected:
                self.is_expected = False
        else:  
            if self.top is not None:
                self.top.removeNextExpectedPoints()
    def setAllPointsToExpected(self):
        if self.next is not None:
            self.next.is_expected = True
        if self.bottom is not None:
            self.bottom.setExpected()
    def setNextPointToExpected(self):
        if self.next is not None:
            self.next.is_expected = True
            return
        if self.bottom is not None:
            self.bottom.setNextPointToExpected()
    def getNextExpectedPoint(self):
        if self.next is not None:
            if self.next.is_expected:
                return self.next
        if self.bottom is not None:
            return self.bottom.getNextExpectedPoint()
    def getCurrentPoint(self):
        if self.next is not None:
            if self.next.is_expected:
                return self
        if self.top is not None:
            return self.top.getCurrentPoint()
    def passExpectedToNextPoint(self):
        if self.is_expected:
            if self.next is not None:
                self.next.is_expected = True
            if self.top is not None:
                self.top.setExpected()
        else:
            if self.top is not None:
                self.top.passExpectedToNextPoint()
    def f(self, current_clock_length, modulus_clock):
        # print(f"point.f self: {self}, current_clock_length: {current_clock_length}, modulus_clock: {modulus_clock}")
        if self.next is not None:
            if current_clock_length > 0:
                remainder = self.next.order_id % current_clock_length
                if remainder > 0:
                    if remainder - 1 == modulus_clock:
                        return self.next
                elif self.next.order_id - 1 == modulus_clock:
                    return self.next
        if self.top is not None:
            self.top.f(current_clock_length, modulus_clock)
        else:
            return None
    def printPoint(self):
        next = None if self.next is None else id(self.next)
        print(f"    ({self.order_id}) {id(self)}: next: {next}, is_expected: {self.is_expected}, expected_sequence_length: {self.expected_sequence_length}")
        if self.top is not None:
            self.top.printPoint()
class Line():
    def __init__(self, id, lines_ref):
        self.id = id
        self.start_point = None
        self.end_point = None
        self.lines_ref = lines_ref
    def addPoint(self, point):
        if self.start_point is None:
            self.start_point = point
            self.end_point = point
        else:
            print(f"adding point self.end_point: {id(self.end_point)}")
            self.end_point.top = point
            point.bottom = self.end_point
            self.end_point = point
    def findExpectedPointsToMatch(self, i):
        if not self.start_point.isExpected(i):
            self.start_point.setAllPointsToExpected()
        else:
            self.start_point.passExpectedToNextPoint()
        self.getNextInput()
    def setNextPointToExpected(self):
        if self.end_point is not None:
            self.end_point.setNextPointToExpected()
    def getNextExpectedPoint(self):
        if self.end_point is not None:
            return self.end_point.getNextExpectedPoint()

    def getCurrentPoint(self):
        if self.start_point is not None:
            return self.start_point.getCurrentPoint()
    def getNextInput(self):
        self.lines_ref.getNextInput()
    def isAnyPointExpected(self):
        if self.start_point is not None:
            return self.start_point.isExpected()
        return False
    def removeExpectedPoints(self):
        return self.start_point.removeExpectedPoints()
    def removeNextExpectedPoints(self):
        return self.start_point.removeNextExpectedPoints()
    def getTopPointOrderId(self):
        if self.end_point is not None:
            return self.end_point.order_id
    def f(self, current_clock_length, modulus_clock):
        # print(f"line.f self: {self}, current_clock_length: {current_clock_length}, modulus_clock: {modulus_clock}")
        if self.start_point is not None:
            return self.start_point.f(current_clock_length, modulus_clock)
        return None
    def printLine(self):
        if self.start_point is not None:
            self.start_point.printPoint()
class ModulusClock():
    def __init__(self, value=-1, length=0):
        self.value = value
        self.prev = -1
        self.length = length
    def __str__(self):
        return f"(value: {self.value}, prev: {self.prev}, length: {self.length})"
    def isOn(self):
        return self.value > -1 and not self.cycleComplete()
    def isOn2(self):
        return self.value > -1
    def isOff(self):
        return self.value == -1 and self.prev == -1 and self.length == 0
    def start(self, length):
        self.value = 0
        self.length = length
    def increment(self):
        self.prev = self.value
        self.value = (self.value + 1) % self.length
    def turnOff(self):
        self.value = -1
        self.prev = -1
        self.length = 0
    def cycleComplete(self):
        if self.length == 1:
            return self.value == 0 and self.value == self.length - 1
        return self.value > 0 and self.value == self.length - 1

class Lines():
    def __init__(self, order_id=0,read_head_ref=None):
        self.lines = {}
        self.order_id = order_id
        self.read_head_ref = read_head_ref
        self.prev_point = None
        self.modulus_clock = -1
        self.current_clock_length = 0
        self.start_status = True
    def __str__(self):
        return f"(lines: {self.lines})"
    def addLine(self, line):
        self.lines[line.id] = line
    def f(self, current_clock_length, modulus_clock):
        # print(f"lines.f self.prev_point: {self.prev_point}, current_clock_length: {current_clock_length}, modulus_clock: {modulus_clock}")
        if self.prev_point is not None:
            return self.lines[self.prev_point.line_ref.id].f(current_clock_length, modulus_clock)
    def removeExpectedPoints(self):
        if self.prev_point is not None:
            self.lines[self.prev_point.line_ref.id].removeExpectedPoints()
    def removeNextExpectedPoints(self):
        if self.prev_point is not None:
            self.lines[self.prev_point.line_ref.id].removeNextExpectedPoints()
    def connectPoints(self, new_point):
        if self.prev_point:
            # print(f"connect points")
            # self.printLines()
            self.prev_point.next = new_point
            new_point.prev = self.prev_point
        self.prev_point = new_point
            
    def matchLine(self, number, i):
        print(f"self.order_id: {self.order_id}, number: {number} self.modulus_clock: {self.modulus_clock} self.current_clock_length: {self.current_clock_length} self.start_status: {self.start_status}")
        # print(f"self.prev_point: {self.prev_point}")
         
        if number in self.lines:
            print(f"self.lines[number].isAnyPointExpected(): {self.lines[number].isAnyPointExpected()}")
            if not self.lines[number].isAnyPointExpected():
                if self.start_status:
                    self.lines[number].setNextPointToExpected()
                    self.prev_point = self.lines[number].getCurrentPoint()
                    self.start_status = False
                    if self.modulus_clock == -1:
                        self.current_clock_length = self.order_id - 1
                        self.order_id = 1
                        self.modulus_clock = 0
                    self.modulus_clock = (self.modulus_clock + 1) % self.current_clock_length
                else:
                    self.removeNextExpectedPoints()
                    match = self.f(self.order_id)
                    print(f"match: {match}")
                    new_point = Point(line_ref=self.lines[number], order_id=self.order_id)
                    if match is not None:
                        new_point.is_expected = True
                        new_point.next = match.next
                        self.lines[number].setNextPointToExpected()
                        self.prev_point = self.lines[number].getCurrentPoint()
                    else:
                        self.modulus_clock = -1
                        self.current_clock_length = 0
                        self.order_id = 1 #
                    self.lines[number].addPoint(new_point)
                    self.connectPoints(self.lines[number].end_point)

            else:
                self.lines[number].removeExpectedPoints()
                new_point = Point(line_ref=self.lines[number], order_id=self.order_id, is_expected=True)
                self.lines[number].addPoint(new_point)
                self.connectPoints(self.lines[number].end_point)
                self.lines[number].setNextPointToExpected()
                self.modulus_clock = (self.modulus_clock + 1) % self.current_clock_length
                if self.modulus_clock == 0:
                    print(f"structural cycle detected at line {number}")
                    self.current_clock_length = 0
                    self.modulus_clock = -1
                    self.order_id = 1
                    self.start_status = True
        else:
            new_line = Line(number, self)
            self.addLine(new_line)
            match = self.f(self.order_id)
            print(f"match: {match}")
            # clock length can't be 0 when adding a new line
            if match is not None:
                new_point = Point(line_ref=self.lines[number], order_id=self.order_id, is_expected=True, next=match.next)
                self.lines[number].addPoint(new_point)
                self.connectPoints(self.lines[number].end_point)
                self.modulus_clock = (self.modulus_clock + 1) % self.current_clock_length
                if self.modulus_clock == 0:
                    print(f"structural cycle detected at line {number}")
            else:
                self.lines[number].addPoint(Point(line_ref=self.lines[number], order_id=self.order_id))
                self.connectPoints(self.lines[number].end_point)
                self.modulus_clock = -1
                self.current_clock_length = 0
                # self.order_id = 1 #

            print(f"new line {number} created")
            print(f"self.modulus_clock: {self.modulus_clock}")
        print()
        self.order_id += 1
        self.getNextInput()
   
    def addNewPoint(self, number, modulus_clock):
        new_point = Point(line_ref=self.lines[number], order_id=self.order_id+1)
        self.order_id += 1
        match = self.f(modulus_clock.length, modulus_clock.value)
        print(f"match: {match}")
        if match is not None:
            if modulus_clock.cycleComplete():
                print(f"structural cycle detected at line {number}")
                modulus_clock.turnOff()
            else:
                modulus_clock.increment()
                new_point.is_expected = True
                new_point.next = match.next
        else:
            modulus_clock.turnOff()
        self.lines[number].addPoint(new_point)
        return new_point
    def matchLine2(self, number, i, modulus_clock):
        if i == 6:
            return
        prev_point_id = None if self.prev_point is None else id(self.prev_point)
        print(f"before: self.prev_point: {prev_point_id}, self.order_id: {self.order_id}, number: {number} modulus_clock.value: {modulus_clock.value} modulus_clock.length: {modulus_clock.length}")
        if number in self.lines and modulus_clock.isOff():
            top_order_id = self.lines[number].getTopPointOrderId()
            clock_length = self.order_id - (top_order_id if top_order_id > 1 else 0)
            if clock_length > 0:
                modulus_clock.start(clock_length)
                new_point = Point(line_ref=self.lines[number], order_id=self.order_id+1)
                self.order_id += 1
                self.lines[number].setNextPointToExpected()
                new_point.next = self.lines[number].getNextExpectedPoint()
                self.connectPoints(new_point)
                self.lines[number].addPoint(new_point)
                self.prev_point = new_point
        elif number in self.lines and modulus_clock.isOn():
            if self.lines[number].isAnyPointExpected():
                modulus_clock.increment()
                if modulus_clock.cycleComplete():
                    print(f"structural cycle detected at line {number}")
                    modulus_clock.turnOff()
                else:
                    self.lines[number].setNextPointToExpected()
            else:
                new_point = self.addNewPoint(self, number, modulus_clock)
                self.connectPoints(new_point)
        elif number not in self.lines:
            new_line = Line(number, self)
            self.addLine(new_line)
            print(f"new line {number} created")
            if modulus_clock.isOn():
                modulus_clock.increment()
            new_point = self.addNewPoint(number, modulus_clock)
            self.connectPoints(new_point)
            self.prev_point = new_point
        prev_point_id = None if self.prev_point is None else id(self.prev_point)
        print(f"after: self.prev_point: {prev_point_id}, self.order_id: {self.order_id}, number: {number} modulus_clock.value: {modulus_clock.value} modulus_clock.length: {modulus_clock.length}")
        self.printLines()

        print()
        print()
        self.getNextInput(modulus_clock)

    def matchLine3(self, number, i, modulus_clock):

        prev_point_id = None if self.prev_point is None else id(self.prev_point)
        expected_length = 0
        print(f"before: self.prev_point: {prev_point_id}, self.order_id: {self.order_id}, number: {number}, modulus_clock_isOn2(): {modulus_clock.isOn2()}, modulus_clock.value: {modulus_clock.value} modulus_clock.length: {modulus_clock.length}")
        if number in self.lines:
            top_expected_length = self.lines[number].end_point.expected_sequence_length
            if top_expected_length == 0:
                if self.prev_point is not None:
                    if self.prev_point.line_ref.id == number:
                        expected_length = 1
                    elif self.prev_point.expected_sequence_length > 0:
                        expected_length = self.prev_point.expected_sequence_length
                    else:
                        expected_length = self.order_id
                else:
                    expected_length = self.order_id
            else:
                expected_length = top_expected_length
            print(f"top_expected_length: {top_expected_length}")
            print(f"expected_length: {expected_length}")
            print(f"self.order_id: {self.order_id}")
            if modulus_clock.isOff():
                clock_length = expected_length
                print(f"clock_length: {clock_length}")
                if clock_length == 0:
                    print(f"structural cycle length == 1 detected at line {number}")
                    modulus_clock.turnOff()
                else:
                    modulus_clock.start(clock_length)
        elif number not in self.lines:
            new_line = Line(number, self)
            self.addLine(new_line)
            if self.prev_point is not None:
                expected_length = self.prev_point.expected_sequence_length
        prev_point_id = None if self.prev_point is None else id(self.prev_point)
        print(f"prev_point: {prev_point_id}")
        new_point = Point(line_ref=self.lines[number], order_id=self.order_id+1, expected_sequence_length=expected_length)
        print(f"new_point: {id(new_point)}")
        if modulus_clock.isOn2():
            print(f"number: {number} modulus_clock.isOn2(): {modulus_clock.isOn2()}")
            if self.prev_point is not None:
                if self.prev_point.next is not None:
                    if self.prev_point.next.is_expected:
                        line_transition_1 = self.prev_point.line_ref.id == new_point.line_ref.id
                        line_transition_2 = self.prev_point.line_ref.id == self.prev_point.next.line_ref.id
                        if line_transition_1 != line_transition_2:
                            print(f"structural cycle broken at line {number}")
                            if line_transition_1:
                                new_point.expected_sequence_length = 1
                            modulus_clock.turnOff()
            if modulus_clock.cycleComplete():
                print(f"structural cycle detected at line {number}")
                modulus_clock.turnOff()
            if self.prev_point is not None:
                if self.prev_point.prev is not None:
                    self.prev_point.prev.is_expected = False
            self.lines[number].setNextPointToExpected()
            new_point.next = self.lines[number].getNextExpectedPoint()
        self.order_id += 1
        self.lines[number].addPoint(new_point)
        self.connectPoints(new_point)
        self.prev_point = new_point

        prev_point_id = None if self.prev_point is None else id(self.prev_point)
        print(f"after: self.prev_point: {prev_point_id}, self.order_id: {self.order_id}, number: {number}, modulus_clock_isOn2(): {modulus_clock.isOn2()}, modulus_clock.value: {modulus_clock.value} modulus_clock.length: {modulus_clock.length}")
        self.printLines()
        if modulus_clock.isOn():
            modulus_clock.increment()
        print()
        print()
        self.getNextInput(modulus_clock)

    def getNextInput(self, modulus_clock):
        self.read_head_ref.next(modulus_clock)
    def printLines(self):
        for line_id in self.lines:
            print(f"{line_id}")
            self.lines[line_id].printLine()
class ReadHead():
    def __init__(self, sequence, lines_ref):
        self.sequence = sequence
        self.i = 0
        self.current_number = 0
        self.lines_ref = lines_ref
    def next(self, modulus_clock):
        if 0 > self.i or self.i >= len(self.sequence):
            return
        print(f"self.i: {self.i}")
        self.current_number = self.sequence[self.i]
        self.i += 1
        self.lines_ref.matchLine3(self.current_number, self.i, modulus_clock)

def x24():

    lines = {
        1: {
            0: Point(top=None, bottom=None, prev=None, next=None),
            1: Point(top=None, bottom=None, prev=None, next=None),
            2: Point(top=None, bottom=None, prev=None, next=None),
            3: Point(top=None, bottom=None, prev=None, next=None),
        },
        2: {
            0: Point(top=None, bottom=None, prev=None, next=None),
        },
        3: {
            0: Point(top=None, bottom=None, prev=None, next=None),
            },
        4: {
            0: Point(top=None, bottom=None, prev=None, next=None),
        },
        5: {
            0: Point(top=None, bottom=None, prev=None, next=None),
        },
    }
    lines[1][0].top = lines[1][1]
    lines[1][1].bottom = lines[1][0]
    lines[1][1].top = lines[1][2]
    lines[1][2].bottom = lines[1][1]
    lines[1][2].top = lines[1][3]
    lines[1][3].bottom = lines[1][2]

    lines[1][0].next = lines[2][0]
    lines[2][0].prev = lines[1][0]

    lines[2][0].next = lines[1][1]
    lines[1][1].prev = lines[2][0]

    lines[1][1].next = lines[3][0]
    lines[3][0].prev = lines[1][1]

    lines[3][0].next = lines[1][2]
    lines[1][2].prev = lines[3][0]

    lines[1][2].next = lines[4][0]
    lines[4][0].prev = lines[1][2]

    lines[4][0].next = lines[1][3]
    lines[1][3].prev = lines[4][0]

    lines[1][3].next = lines[5][0]
    lines[5][0].prev = lines[1][3]


    lines[1][0].getCount()
    lines[2][0].getCount()
    lines[3][0].getCount()
    lines[4][0].getCount()
    lines[5][0].getCount()

    lines[1][0].findPointsOnOtherLinesWithSameCount(lines[1][0].current_count)
    lines[1][1].findPointsOnOtherLinesWithSameCount(lines[1][1].current_count)
    lines[1][2].findPointsOnOtherLinesWithSameCount(lines[1][2].current_count)
    lines[1][3].findPointsOnOtherLinesWithSameCount(lines[1][3].current_count)

    lines[2][0].findPointsOnOtherLinesWithSameCount(lines[2][0].current_count)
    lines[3][0].findPointsOnOtherLinesWithSameCount(lines[3][0].current_count)
    lines[4][0].findPointsOnOtherLinesWithSameCount(lines[4][0].current_count)
    lines[5][0].findPointsOnOtherLinesWithSameCount(lines[5][0].current_count)


    print()
    for key in lines:
        for key2 in lines[key]:
            print(lines[key][key2])
        print()

def x25():
    # [1, 2, 2, 1, 3, 3]
    # [1, 2, 1, 2, 1, 1]
    # [1, 2, 3, 1, 2, 3, 1, 4, 5]
    # [1, 2, 1, 2, 1, 3, 1, 3]
    # [1, 1, 1, 1, 1]
    lines = Lines()
    read_head = ReadHead([1, 2, 1, 2, 1, 1], lines)
    lines.read_head_ref = read_head
    modulus_clock = ModulusClock()

    read_head.next(modulus_clock)
    # lines.printLines()
    # print()
    # for line_id in lines.lines:
    #     print(f"line_id: {line_id}, line: {lines.lines[line_id]}")
    #     tracker = lines.lines[line_id].start_point
    #     while tracker != None:
    #         print(f"tracker: {tracker}\n")
    #         tracker = tracker.top
    

x25()