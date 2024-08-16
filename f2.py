def getPoint(lines, tracker):
    return lines[tracker["line"]][tracker["point"]]

def x21():

    sequence1 = [1, 2, 3, 4, 2, 3, 5, 2, 3, 1]

    lines = {}

    prev_line = 0
    prev_point = 0
    # current_line = 0
    current_point = 0
    retrace_step_count = 0
    predictions = []
    start_current_path = {"line": 0, "point": 0}
    end_current_path = {"line": 0, "point": 0}
    start_tracker_path = {"line": 0, "point": 0}
    end_tracker_path = {"line": 0, "point": 0}
    prev_context_points = []
    current_context_point = {}
    for i, current_line in enumerate(sequence1):
        predictions = [{"line": getPoint(lines, prediction)["next_line"],
                     "point": getPoint(lines, prediction)["next_point"]}
                            for prediction in predictions
                                if getPoint(lines, prediction)["next_line"] == current_line]
        print(f"{i} {current_line} {predictions}")

        if len(predictions) == 0:
            if current_line not in lines:
                lines[current_line] = {0: {"prev_line": prev_line, "prev_point": prev_point, "next_line": 0, "next_point": 0}}
                predictions = [{"line": current_line, "point": i} for i, _ in enumerate(lines[current_line])]                
                if prev_line in lines:
                    lines[prev_line][prev_point]["next_line"] = current_line
                    lines[prev_line][prev_point]["next_point"] = current_point
            else:
                if len(current_context_point) == 0:
                    current_context_point = {"line": prev_line, "point": prev_point}
                if len(current_context_point) == 0:
                    prev_context_points = [{"line": getPoint(lines, current_line)["prev_line"],
                                            "point": getPoint(lines, current_line)["prev_point"]}
                                                for i in lines[current_line]]
                print(f"revisit prev line: {i} {current_line} {predictions}")
                predictions = [{"line": current_line, "point": i} for i, _ in enumerate(lines[current_line])]                

                pass
        prev_line = current_line
        prev_point = len(lines[current_line])-1
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