

include_and_c_files =  main.c vector.c vector.h balanced_tree_node.c balanced_tree_node.h contextual_state_chart.c contextual_state_chart.h standard_includes.h

object_files =  main.o vector.o



%.o:%.c $(include_and_c_files)
	gcc $< -c


state_machine.x: $(object_files)

	gcc $(object_files) -o state_machine.x 

test:
	make clean

	-make state_machine.x
	#-./state_machine.x input.txt
	# -./state_machine.x parsing_tree_copy.json calculator_example.txt
	#-./state_machine.x insert_test_5.json calculator_example.txt
	#-./state_machine.x tokens_to_trie_tree_test.json calculator_example.txt

	-./state_machine.x parsing_tree.json calculator_example.txt
	#-./state_machine.x parsing_tree.json parallel_programming_example.txt
	# -./state_machine.x parsing_tree.json parallel_programming_example2.txt

	#-./state_machine.x parsing_tree.json start.txt

	#-./state_machine.x parallel_programming_example_json.json calculator_example.txt

	# -./state_machine.x parallel_programming_example.json parallel_programming_example.txt

	#-./state_machine.x parsing_tree.json little_sequence_hierarchy.txt
	#-./testing.x parsing_tree.json calculator_example.txt
run:
	-./state_machine.x parsing_tree.json calculator_example.txt
python3Run:
	python3 f3.py

clean:
	-rm *.o *.x
