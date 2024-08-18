def getPoint(lines, tracker):
    return lines[tracker["line"]][tracker["point"]]

def x21():

    import copy
    # [1, 2, 3, 1, 3, 2]
    # [1, 2, 3, 1, 3, 2, 4, 3]
    sequence1 = [1, 2, 3, 4, 2, 3, 5, 2, 3, 1]

    lines = {}

    # prev_line = 0
    # prev_point = 0
    # current_line = 0
    current_point = 0
    retrace_step_count = 0
    predictions = []
    start_current_path = {"line": 0, "point": 0}
    end_current_path = {"line": 0, "point": 0}
    start_tracker_path = {"line": 0, "point": 0}
    end_tracker_path = {"line": 0, "point": 0}
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
                    print(f"{current_line} prev_point: {prev_point} prev_prev_point: {prev_prev_point} {predictions}, {prev_successful_predictions}")
                    print(f"found end of pattern")
                    print(f"points")
                    [print(key, value) for key, value in lines.items()]
                    pattern_number = len(lines) * -1
                    lines[pattern_number] = {0: {"prev_line": first_prev_point["line"],
                                                 "prev_point": first_prev_point["point"],
                                                 "next_line": 0, "next_point": 0,
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
                    print(f"lines")
                    [print(key, value) for key, value in lines.items()]

                if retrace_step_count == 1:
                    retrace_step_count = 0
                    lines[prev_point["line"]][len(lines[prev_point["line"]])] = {"prev_line": prev_prev_point["line"], "prev_point": prev_prev_point["point"], "next_line": 0, "next_point": 0}
                    if current_line in lines:
                        lines[current_line][len(lines[current_line])] = {"prev_line": prev_point["line"], "prev_point": len(lines[prev_point["line"]])-1, "next_line": 0, "next_point": 0}
                    else:
                        lines[current_line] = {0: {"prev_line": prev_point["line"], "prev_point": len(lines[prev_point["line"]])-1, "next_line": 0, "next_point": 0}}
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

    print(f"points")
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

x21()