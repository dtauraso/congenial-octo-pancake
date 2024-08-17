def getPoint(lines, tracker):
    return lines[tracker["line"]][tracker["point"]]

def x21():

    import copy
    # [1, 2, 3, 4, 2, 3, 5, 2, 3, 1]
    sequence1 = [1, 2, 3, 1, 3, 2]

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
        # print(f"{predictions}")
        prev_successful_predictions = copy.deepcopy(predictions)
        predictions = [
                        {"prev_point": prediction["prev_point"],
                        "prediction": {"line": getPoint(lines, prediction["prediction"])["next_line"],
                                       "point": getPoint(lines, prediction["prediction"])["next_point"]}}            
                            for prediction in predictions
                                if getPoint(lines, prediction["prediction"])["next_line"] == current_line]
        print(f"{i} {current_line} {prev_point} {prev_prev_point} predictions {predictions} retrace {retrace_step_count}")
        # print(f"points")
        # [print(key, value) for key, value in lines.items()]
        if len(predictions) == 0:
            if retrace_step_count > 1:
                retrace_step_count = 0
                if len(prev_successful_predictions) > 0:
                    print(f"found end of pattern")
                    pass
                pass
            if current_line not in lines:
                print(f"{prev_point} {current_line}")
                if prev_point["line"] in lines:
                    getPoint(lines, prev_point)["next_line"] = current_line
                    getPoint(lines, prev_point)["next_point"] = 0
                lines[current_line] = {0: {"prev_line": prev_point["line"], "prev_point": prev_point["point"], "next_line": 0, "next_point": 0}}
                predictions = [
                    {"prev_point": {"line": prev_point["line"], "point": prev_point["point"]},
                        "prediction": {"line": current_line, "point": i}} for i, _ in enumerate(lines[current_line])]
                # [print(key, value) for key, value in lines.items()]
                prev_point["line"] = current_line
                prev_point["point"] = 0
            else:
                if retrace_step_count == 1:
                    retrace_step_count = 0
                    print(f"retracing")
                    [print(key, value) for key, value in lines.items()]
                    print()
                    lines[prev_point["line"]][len(lines[prev_point["line"]])] = {"prev_line": prev_prev_point["line"], "prev_point": prev_prev_point["point"], "next_line": 0, "next_point": 0}
                    lines[current_line][len(lines[current_line])] = {"prev_line": prev_point["line"], "prev_point": len(lines[prev_point["line"]])-1, "next_line": 0, "next_point": 0}
                    lines[prev_prev_point["line"]][prev_prev_point["point"]]["next_line"] = prev_point["line"]
                    lines[prev_prev_point["line"]][prev_prev_point["point"]]["next_point"] = len(lines[prev_point["line"]])-1
                    lines[prev_point["line"]][len(lines[prev_point["line"]])-1]["next_line"] = current_line
                    lines[prev_point["line"]][len(lines[prev_point["line"]])-1]["next_point"] = len(lines[current_line])-1
                    print(f"{prev_prev_point}")
                    [print(key, value) for key, value in lines.items()]
                    print(f"{i} {current_line} {prev_point} {prev_prev_point} {retrace_step_count}")
                    print(f"done")
                    print()
                    continue
                retrace_step_count = 1
                prev_prev_point = {"line": prev_point["line"], "point": prev_point["point"]}                
                prev_point["line"] = current_line
                prev_point["point"] = len(lines[current_line])-1 #current_point

                print(f"revisit prev line: {i} {current_line} {predictions} {prev_prev_point}")
                predictions = [
                    {"prev_point": {"line": lines[current_line][key]["prev_line"],
                                               "point": lines[current_line][key]["prev_point"]},
                     "prediction": {"line": current_line, "point": key}}
                        for key in lines[current_line]]                
            

        else:
            retrace_step_count += 1
            pass
        print()
        # print(f"{prev_point} {lines.keys()} {current_line}")
        # prev_point["line"] = current_line
        # prev_point["point"] = len(lines[current_line])-1
        # current_line = item
        # print(f"{current_line}")
        # [print(key, value) for key, value in lines.items()]
        # print()
        # if current_line not in lines:
        #     print(f"new line: {i} {item} {trackers} {retrace_step_count}")
        #     if len(trackers) > 0:
        #         retrace_step_count = 0
        #         trackers = []
        #     lines[current_line] = {0: {"prev_line": prev_line, "prev_point": prev_point, "next_line": 0, "next_point": 0}}
        #     if prev_line in lines:
        #         lines[prev_line][prev_point]["next_line"] = current_line
        #         lines[prev_line][prev_point]["next_point"] = current_point
        # else:
        #     print(f"revisit prev line: {i} {item} {trackers} {retrace_step_count}")
        #     if len(trackers) == 0:
        #         trackers = [{"line": current_line, "point": i} for i, _ in enumerate(lines[current_line])]
        #         retrace_step_count = 1
        #     else:
        #         trackers = [{"line": lines[tracker["line"]][tracker["point"]]["next_line"],
        #                      "point": lines[tracker["line"]][tracker["point"]]["next_point"]}
        #                         for tracker in trackers
        #                             if lines[tracker["line"]][tracker["point"]]["next_line"] == current_line]
        #         if len(trackers) > 0:
        #             retrace_step_count += 1
        #             if i == len(sequence1)-1:
        #                 print(f"revisit prev line end: {i} {item} {trackers} {retrace_step_count}")
        #                 if retrace_step_count > 1:
        #                     print(f"pattern found")
        #                     pass
        #                 retrace_step_count = 0
        #                 trackers = []
        #                 pass
        #         else:
        #             if retrace_step_count > 1:
        #                 print(f"pattern found")
        #                 pass
        #             retrace_step_count = 0
        #             trackers = []
        #             pass
        # lines[current_line][len(lines[current_line])] = {"prev_line": prev_line, "prev_point": prev_point, "next_line": 0, "next_point": 0}
        # current_point = len(lines[current_line])-1
        # lines[prev_line][prev_point]["next_line"] = current_line
        # lines[prev_line][prev_point]["next_point"] = current_point
        # prev_line = current_line
        # prev_point = len(lines[current_line])-1


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