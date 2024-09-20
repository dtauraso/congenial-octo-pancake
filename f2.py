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

    lines[1] = {}
    import copy
    histogram = {line: len(points) for line, points in lines[0].items()}
    parent_points = []
    while len(histogram) > 0:

        max_count = max(histogram.values())
        if max_count == 1:
            break
        max_count_lines = [line for line, count in histogram.items() if count == max_count]
        print(f"Line(s) with the highest count: {max_count_lines}")
        new_line_id = len(lines[0]) * -1
        lines[0][new_line_id] = {0: {}}

        new_sequence_line_id = len(max_count_lines) - 1
        lines[1][new_sequence_line_id] = {0: {"children": []}}
        parent_points.append({"line": new_sequence_line_id, "point": 0})
        prev = {"line": 0, "point": 0}
        for line_id in max_count_lines:
            line = copy.deepcopy(lines[0][line_id])
            for point in line:
                lines[0][line_id][point]["parent"] = {"line": new_line_id, "point": 0}
                lines[0][line_id][len(lines[0][line_id])] = {"prev": {"line": prev["line"], "point": prev["point"]},
                                                        "next": {"line": 0, "point": 0},
                                                        "parent": {"line": new_sequence_line_id, "point": 0}}
                if prev["line"] in max_count_lines:
                    getPoint(lines[0], prev)["next"] = {"line": line_id, "point": len(lines[0][line_id])-1}
                prev["line"] = line_id
                prev["point"] = len(lines[0][line_id])-1
            lines[1][new_sequence_line_id][0]["children"].append({"line": line_id, "point": point})
            histogram = {line_id: len(points)
                        for line_id, points in lines[0].items()
                            if all("parent" not in lines[0][line_id][point_id]
                                for point_id in points) and line_id > 0}

    print(f"parent_points: {parent_points}")
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

    sequence1 = [1, 2, 7, 1, 3, 1, 12, 4, 1, 5, 6, 45, 2, 6, 3, 6, 4, 6, 5]

    lines = traceLine(sequence1)

    print(f"lines")
    [print(key, value) for key, value in lines.items()]
    print()
    # groupColumns(lines)
    groupLines(lines)
    # findPatternEdges(lines, {"line": 2, "point": 0})
    # removeSingleItems(lines)
    # foldPatterns(lines, {"line": 1, "point": 0}, None)
    print(f"lines")
    for key in lines:
        print(key)
        [print(key, value) for key, value in lines[key].items()]
    print()


        
x23()