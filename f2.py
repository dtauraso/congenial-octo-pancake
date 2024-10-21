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

    def __init__(self, id, top, bottom, prev, next):
        self.id = id
        self.top = top
        self.bottom = bottom
        self.prev = prev
        self.next = next
        self.current_count = 0
        self.visited = 0
    def __str__(self):
        return f"(point id: {self.id}, current count: {self.current_count})"
    def getCount(self, level_id):
        print(f"{level_id} {self.id} {self.bottom == None and self.top != None} {self.bottom != None and self.top == None}")
        if self.visited == 0:
            self.visited = 1
            if level_id == 0:
                current_count = self.bottom.getCount(level_id + 1) + 1
                self.current_count = current_count
            elif self.bottom == None and self.top != None:
                return 1
            elif self.bottom != None and self.top == None:
                return 1
            elif self.bottom != None and self.top != None:
                current_count = self.bottom.getCount(level_id + 1) + self.top.getCount(level_id + 1) + 1
                self.current_count = current_count
                return current_count
        else:
            return 0


    def sendCount(self, count):
        self.current_count = count
        if self.bottom != None:
            self.bottom.sendCount(count)
    def matchCount(self, count):
        return self.current_count == count
    def findPointsOnOtherLinesWithSameCount(self):
        if self.next == None:
            return [self.id]
        else:
            same_count_points = [self.id] + self.next.findPointsOnOtherLinesWithSameCount()

def x241(sequence, i, number):
    pass
def x24():

    lines = {
        1: {
            0: Point(id=0, top=None, bottom=None, prev=None, next=None),
            1: Point(id=1, top=None, bottom=None, prev=None, next=None),
            2: Point(id=2, top=None, bottom=None, prev=None, next=None),
            3: Point(id=3, top=None, bottom=None, prev=None, next=None),
        },
        2: {
            0: Point(id=0, top=None, bottom=None, prev=None, next=None),
        },
        3: {
            0: Point(id=0, top=None, bottom=None, prev=None, next=None),
            },
        4: {
            0: Point(id=0, top=None, bottom=None, prev=None, next=None),
        },
        5: {
            0: Point(id=0, top=None, bottom=None, prev=None, next=None),
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


    lines[1][3].getCount(0)

    print()
    for key in lines:
        for key2 in lines[key]:
            print(lines[key][key2])
        print()

x24()