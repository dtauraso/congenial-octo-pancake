// #include "standard_headers.h"

// #include "state.h"
#include "vector.h"
// #include "contex.h"
// #include "trie_tree.h"

//#include "trie_node.h"

// #include "scanner.h"
//https://zserge.com/jsmn.html
//#include "jsmn/jsmn.h"
//#include <string>
//using namespace std;
// struct Vector;
// Vector* TrieTreeInsertWords(TrieTree* my_trie_tree, Vector* name /* strings*/);

// //void printState(ContextState* node);
// enum token_types {_primitive, _object, _array, _string};
// enum data_types{is_list, is_string, is_empty_case};

// //bool returnTrue(ContextState* a);
// //bool returnFalse(ContextState* a);
// void test();
typedef struct Point2 {
	int point_id;
	int line_id;
	Vector* parents;
	struct Point2* prev;
	struct Point2* next;
}Point2;
void findPattern() {

	int array1[12] = {1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2};

	int line_length = 12;
	
	Vector* one = VectorInitVector();

	Vector* two = VectorInitVector();

	Vector* three = VectorInitVector();

	Vector* streak_lengths = VectorInitVector();

	VectorAppend(streak_lengths, one);
	VectorAppend(streak_lengths, two);
	VectorAppend(streak_lengths, three);

	int current_line_id = array1[0];
	bool change_current_line_id = false;
	int copy_streak_prev = 0;
	int copy_streak_current = 0;
	Point2* copy_streak_tracker_prev = NULL;
	Point2* copy_streak_tracker_current = NULL;
	bool reset_copy_streak_trackers = false;
	Point2* tracker = NULL;
	Point2* start_of_sequence = NULL;
	for (int i = 0; i < line_length; i++) {
		int streak_length = array1[i];

		void* streak_length_line = VectorGetItem(streak_lengths, streak_length-1);
		int streak_length_line_population = ((Vector*)streak_length_line)->population;
		
		Point2* point = (Point2*) malloc(sizeof(Point2));
		point->line_id = streak_length;
		point->point_id = streak_length_line_population;
		point->next = NULL;
		if (tracker == NULL) {
			point->prev = NULL;
			tracker = point;
			start_of_sequence = point;
		}
		else {
			tracker->next = (Point2*) malloc(sizeof(Point2));
			tracker->next = point;
			point->prev = tracker;
			tracker = tracker->next;
		}
		VectorAppend((Vector*)streak_length_line, (void*)point);
		if (current_line_id == streak_length) {
			copy_streak_current++;
		}
		else if (current_line_id != streak_length) {
			copy_streak_tracker_current = tracker->prev;
			printf("change line from %i to %i\n", current_line_id, streak_length);
			printf("i: %i, streak length: %i\n", i, streak_length);
			printf("i: %i, line: %i population: %i\n", i, streak_length, streak_length_line_population);
			printf("i: %i, streak length: %i, copy streak prev: %i copy streak current: %i\n", i, streak_length, copy_streak_prev, copy_streak_current);
			if (copy_streak_prev > 0 && copy_streak_current > 0) {
				printf("tracker: line id: %i, point id: %i\n", tracker->line_id, tracker->point_id);
				if (copy_streak_tracker_prev != NULL) {
					printf("copy tracker prev: line id: %i, point id: %i\n", copy_streak_tracker_prev->line_id, copy_streak_tracker_prev->point_id);
				}
				if (copy_streak_tracker_current != NULL) {
					printf("copy tracker current: line id: %i, point id: %i\n", copy_streak_tracker_current->line_id, copy_streak_tracker_current->point_id);
				}
				void* copy_streak_prev_line = VectorGetItem(streak_lengths, copy_streak_prev-1);
				void* copy_streak_current_line = VectorGetItem(streak_lengths, copy_streak_current-1);
				void* copy_streak_current_line_id = VectorGetPoint2WithNextId((Vector*)copy_streak_prev_line, copy_streak_current);
				if (copy_streak_current_line_id == NULL) {
					printf("copy streak current line id is NULL\n");
					Point2* copy_streak_prev_point = (Point2*) malloc(sizeof(Point2));
					copy_streak_prev_point->line_id = copy_streak_prev;
					copy_streak_prev_point->point_id = ((Vector*)copy_streak_prev_line)->population;

					Point2* copy_streak_current_point = (Point2*) malloc(sizeof(Point2));
					copy_streak_current_point->line_id = copy_streak_current;
					copy_streak_current_point->point_id = ((Vector*)copy_streak_current_line)->population;

					copy_streak_prev_point->next = copy_streak_current_point;
					copy_streak_prev_point->prev = NULL;

					copy_streak_current_point->next = NULL;
					copy_streak_current_point->prev = copy_streak_prev_point;

					VectorAppend((Vector*)copy_streak_prev_line, (void*)copy_streak_prev_point);
					VectorAppend((Vector*)copy_streak_current_line, (void*)copy_streak_current_point);
					copy_streak_tracker_prev = NULL;
					copy_streak_tracker_current = NULL;
					copy_streak_prev = 0;
					copy_streak_current = 1;
					reset_copy_streak_trackers = true;
				}
				else {
					printf("copy streak current line id is not NULL\n");
				}
			}
			if (!reset_copy_streak_trackers) {
				copy_streak_tracker_prev = copy_streak_tracker_current;
				copy_streak_prev = copy_streak_current;
				copy_streak_current = 1;
			}
			else {
				reset_copy_streak_trackers = false;
			}
			current_line_id = streak_length;
		}
	}

	VectorPrintPoint2(one);
	VectorPrintPoint2(two);
	VectorPrintPoint2(three);

}
/*
ContextState* makeFullContextState(
	TrieNode* name,
	TrieNode* nexts,
	TrieNode* start_children,
	TrieNode* children,
	string function_name,
	Data* variable_from_json_dict,
	TrieNode* parents,
	bool start_children_are_parallel,
	bool nexts_are_parallel,
	bool is_start_child,
	bool is_child,
	bool is_parent,
	bool is_start_state,
	bool is_end_state,
	bool is_data_state);
*/
/*
char* copyString(char* b)
{
	int size = sizeof(char) * (strlen(b) + 1);
	char* a = malloc(size);
	memcpy(a, b, size);
	return a;
}
*/

// string getNextWord(string input, int i)
// {
//  	// this function gets the next word
// 	int j = 0;
// 	int count = 0;
// 	if(i >= input.size())
// 	{
// 		return NULL;
// 	}
// 	while(input[i + j] != '\n')
// 	{
// 		//printf("%c ", input[i + j]);
// 		// can't trust the input
// 		/*if((i + j) >= strlen(input))
// 		{
// 			j--;
// 			break;
// 		}*/
// 		j++;
// 		count++;
// 	}
// 	//printf("character count %i\n", count);
// 	string word = input.substr(i, j);
// 	//char* word = malloc(sizeof(char) * j );
// 	//printf("%i\n", j);
// 	//memcpy(word, input + i, j);
// 	//word[j] = '\0';
// 	//printf("|%s|\n", word);
// 	//printf("chars in word %lu\n", strlen(word));
// 	/*
// 	collect the word
// 	return word
// 	*/
// 	return word;
// }
/*
char* surroundByQuotes(char* word_from_input)
{
	int size = strlen(word_from_input);
	int new_size = size + 2;
	char* word_surrounded_by_quotes = malloc(sizeof(char) * new_size);
	word_surrounded_by_quotes[0] = '\"';
	memcpy(word_surrounded_by_quotes + 1, word_from_input, sizeof(char) * size);
	word_surrounded_by_quotes[new_size - 1] = '\"';

	word_surrounded_by_quotes[new_size] = '\0';
	//printf("word saved %s\n", word_surrounded_by_quotes);

	return word_surrounded_by_quotes;
}
*/
// bool whiteSpace(char character)
// {

// 	return character < '!';
// }
// int countTabs(string input, int i)
// {
// 	int k = 0;
// 	//printf("input\n|%s|, %i\n", input, i);
// 	// this 't' is actually invisable from Atom when used as a tab character
// 	// input[i + k] must be in non-whitespace ascii range
// 	//printf("whitespace %i\n", whiteSpace(input[i + k]));
// 	while(whiteSpace(input[i + k]))
// 	{
// 		//char x = '!';
// 		//printf("counting tab validation |%c|, |%c|, %i\n", input[i + k], x, input[i + k] < x);

// 		//printf("at least 1 white space\n");
// 		k++;
// 		if(input[i + k + 1] == '\0')
// 		{
// 			break;
// 		}
// 	}
// 	//printf("tab count %i\n", k);
// 	return k;
// }

// string makeSpaces(int indent_level)
// {
// 	/*if(indent_level == 0)
// 	{
// 		return ' ';
// 	}*/
// 	//printf("making indents\n");
// 	// this might mess up the reading in graph algorithm
// 	//indent_level++;
// 	//printf("here\n");

// 	//string indents2;
// 	string x = "";
// 	//printf("here 2\n");

// 	for(int i = 0; i < indent_level; i++)
// 	{
// 		//printf("%i|%s|\n", i, x.c_str());

// 		x += ' ';
// 	}
// 	/*
// 	char* indents;
// 	indents = malloc(indent_level + 1);
// 	memset(indents, ' ', sizeof(char) * indent_level);
// 	indents[indent_level] = '\0';
// 	*/
// 	//printf("|%s|\n", indents2.c_str());


	
// 	return x;


// }

void swap(int* a, int* b)
{
	int temp = *a;
	*a = *b;
	*b = *a;
}

/*
void doubleLinkHash(ht_hash_table* input_states, const char* parent, const char* child)
{
	//printf("%s <=> %s\n", parent, child);
	//printHash(input_states);

	//input_states = appendParentLink(input_states, child, parent);
	appendLink(input_states, child, parent, 1); // 1 == parents

	//printf("here\n");

	appendLink(input_states, parent, child, 0); // 0 == children
	//printf("here 2\n");

}*/
// string trimEndOfInput(string input)
// {
// 	//if(input != NULL)
// 	//{
// 		int last_letter_location = input.size() - 1;

// 		while(last_letter_location >= 0 && whiteSpace(input[last_letter_location]))
// 		{
// 			last_letter_location--;
// 		}
// 		if(last_letter_location < 0)
// 		{
// 			return NULL;
// 		}

// 		//int new_size = sizeof(char) * (last_letter_location + 1);
// 		string trimmed_input2 = input.substr(0, last_letter_location + 1);
// 		/* 
// 		char* trimmed_input = malloc(new_size);
// 		memcpy(trimmed_input, input, new_size);
// 		*/
// 		trimmed_input2 += '\n';
// 		return trimmed_input2;
// 	//}
// 	return /*NULL*/"";
// }
// int countLines(string input)
// {
// 	int num_lines = 0;
// 	unsigned input_size = input.size();
// 	//printf("%s\n", input);
// 	int i = 0;
// 	for(; i < input_size; i++)
// 	{
// 		//printf("|%c|\n", input[i]);
// 		if(input[i] == '\n')
// 		{
// 			num_lines++;
// 			//printf("%i\n", num_lines);
// 		}
// 	}
// 	if(input[i - 1] != '\n')
// 	{
// 		num_lines++;
// 	}
// 	return num_lines;
// }




// 2 hash tables
// each input name + object name -> object holding the name
// parse tree each name part -> waypoint object or object holding data

// 1 tri tree for the name part chain to the object holding data, so auto-enumerating
// new states is simple



// string readFile(char* file_name)
// {
// 	FILE* file = fopen(file_name, "r");
// 	string my_string;
// 	size_t n = 0;
// 	int c;

// 	if(file == NULL)
// 	   return NULL; // file can't be opened
//    fseek(file, 0, SEEK_END);
//    long f_size = ftell(file);
//    fseek(file, 0, SEEK_SET);

//    my_string.resize(f_size);
//    //string = malloc(f_size);

//    while((c = fgetc(file)) != EOF)
//    {
// 	   my_string[n++] = (char) c;
//    }
//    //string[n] = '\0';
//    return my_string;
//   }
/*
string collectChars(jsmntok_t token, const char* string input)
{
	int size = token.end - token.start;
	string json_part;
	json_part.resize();
	//char* json_part = malloc(sizeof(char) * size);
	json_part = input.substr(token.start, size);
	//memcpy(json_part, input + token.start, sizeof(char) * size);
	//json_part[size] = '\0';

	return json_part;//surroundByQuotes(json_part);
;

}*/
/*
typedef struct TrieNode
{
	// letters of the entire state name
	char letter;
	struct TrieNode* neighbors;
	struct ContextState* object;
}TrieNodee;

name:
string
|name|
array
|["states", "state"]|
string
|states|
string
|state|
array string string


next:
string
|nexts|
array
|[]|
array([])

start children:
string
|start_children|
array
|[["names", "0"]]|
array
|["names", "0"]|
string
|names|
string
|0|

array array string string

array array string string ... array string ...

first array
	[]
	done
1, nth array
	strings
	if string == children
		done
if first array
	if next token == []
		done
while(true)
	if next token == string
		has string
		if token.strings != keyword
			collect
		else
			done

children:
string
|children|
array
|[]|

function name:
string
|function_name|
string
|returnTrue|

data:
string
|data|
object
|{"nothing": "null"}|
string
|nothing|
string
|null|

parents:
string
|parents|
array
|[["root", "0"]]|
array
|["root", "0"]|
string
|root|
string
|0|

insert the link names into the trie
the leaf nodes will link to the ContextState object

object is the ContextState
first array token will be ignored
array -> []
array -> array (not [])
array -> string string ... untill string == key_name

sub object is inside a ContextState
sub object -> {}
sub object -> string string pairs ... untill string == key_name

makeContextState
	read the tokens in the object and make the context state from them
	add each object to a hash table

*/
// enum token_types {_primitive, _object, _array, _string};

// user can't use "\n" in the state name
// make a string of entire name[name1\nname2/\n...] -> contextState map
// then partal name -> contextState (each internal node in the trie is a dummy node, unless a state name is a partial path)
	/*
string tokenType(jsmntok_t token)
{
	switch(token.type)
	{
		case _primitive:
			return "primitive";
		case _object:
			return "object";
		case _array:
			return "array";
		case _string:
			return "string";
	}
}
bool tokenIsKeyWord(string token_string)
{
	return  token_string == "function_name"  	||
		    token_string == "start_children" 	||
		    token_string == "children"		  	||
		    token_string == "nexts"				||
  		    token_string == "name"			 	||
    	    token_string == "parents"		 	||
      	    token_string == "data";
}
*/
// enum data_types{is_list, is_string, is_empty_case};

// for reading the token sequence the json parsing api provides




int main(int argc, char** argv)
{
	// string input = readFile(argv[2]);
	//printf("%s\n", input.c_str());
	// if(input.size() == 0)
	// {
	// 	printf("can't find %s\n", argv[2]);
	// 	exit(1);
	// }
	// printf("parsing %s\n", argv[2]);
	// todo
	//printf("make tree\n");
	// get rid of all blank lines
	//test();
	// string trimmed_input = trimEndOfInput(input);
	// if(trimmed_input.size() > 0)
	// {
	// 	//free(input);
	// 	//input = NULL;
	// 	//printf("|%s|\n", trimmed_input.c_str());
	// 	//exit(1);
		
	// 	Scanner* my_scanner = initScanner(trimmed_input);
	// 	//printf("here\n");

	// 	makeTreeStateMachine(my_scanner);
	// 	// printTree2(my_scanner->_lines_graph, 2, 0);

	// }
	// TrieTreeTest();
	// VectorTest();
	// BalancedTreeNodeTest();
	// ContextualStateChartTest();
	int array1[2] = {10};
	int array2[2] = {11};
	int differenceWeights[2] = {0};
	// counters(array1, array2, differenceWeights);

	// distances();
	findPattern();
	// int list1[] = {0, 0, 0, 1};
	// int list2[] = {0, 0, 0, 0, 1};

	// Vector* x = VectorInitVector();
	// makeSequence(fillVector(list1, 4), fillVector(list2, 5), x);
	// DynamicMachineTest();
	// tests pass so far
	// DynamicMachineTest2();
	exit(1);

	/*
	bool insertState1(	Vector** name, // strings
					Vector*** start_children,  // array of strings
					Vector*** children, // array of strings
					Vector*** next_states, // array of strings
					Data* value) // primitive

*/
	/*
	parsing machine

	*/
	/*
	use parsing states as state graph input to test
	get all the state names first

	get the links and function names second
		if reference is not already found
			deal with error
		if any next link is on a level above the current state
			deal with error
		start child links always go to a lower level
		
		

		
		start
			next
				(current_state children_flag | current_state next_flag)
		nth state that passes
		current_state
			children_flag
				init
					next
						setup first set of next states
				first_state
					next
						try one
				nth_state

		setup first set of next states
			next
				is there anything in the set, run the set of next states
		is there anything in the set
			next
				run the set of next states
		run the set of next states
			children
				variables
					children
						pass_counter
						total_next_states
						kind of next states
							data
								"nexts"
				-parallel
					next
						(try one | current run fails)
				try one
					next
						(first_state_tried | nth_state_tried)
				first_state_tried
					next
						current_state children_flag first_state
				nth_state_tried
					next
						current_state.children_flag nth_state
				current run fails
					nexts
						(not all failed | all fail)
					function
				not all failed
					nexts
						try one
				all fail
				-non-parallel

	.VectorAppend

	makeVectorOfVectors2(vector_1, vector_2)
	*/
	// init DynamicMachine
	// make and run the machine with 1 api call
		/*
	object collector -> n objects
	object builder -> 1 object
	json stream snippets -> 1 string
	design top down

	*/
	/*
	start
		nexts
		current_state children_flag
		current_state next_flag
		children
		null
	*/

	/*
	Vector* list_of_lists_of_strings = VectorCombineVectors(
										VectorAddStringToVector2("current_state", "children_flag"),
										VectorAddStringToVector2("current_state", "next_flag"));
	
	for(int i = 0; i < list_of_lists_of_strings->population; i++)
	{
		VectorPrintStrings((Vector*) list_of_lists_of_strings->values[i]);
		printf("\n");

	}
	*/
	// printf("\n");

	// StateMachine* my_machine = setupMachine(/*_search*/1, /*empty*/0);
	// DynamicMachine* my_dynamic_machine = initDynamicMachine(my_machine);


	// insert all, delete all
	// insert, delete each one
	// testing no existing object and we are already at the last word
	// testing has only been what was inserted, not what was returned
	// no prior data
	/*
	a
	a, e
	a, e, f
	a, e, h
	a, e, i
	a, e, g
	b
	c
	c, d
	*/




	/*
	insert adds doo many state ids

	print tree of words doesn't take some nulls into acount
	*/
	//TrieTreePrintTrieWords(my_dynamic_machine->trie_tree_dict);
	// testing the trie tree
	// TrieTreeTest();
	/*
	start
		start 1
			start 2
	*/
	// passes
	//TrieTreePrintTrie(my_dynamic_machine->trie_tree_dict);
	//exit(1);
	// 
	//Vector* name2 = VectorAddStringToVector2("start2", "2");
	//name2 = TrieTreeInsertWords(my_dynamic_machine->trie_tree_dict, name2);
	//VectorPrintStrings(name2);
	//printf("\n");
	//TrieTreePrintTrie(my_dynamic_machine->trie_tree_dict);
	//TrieTreePrintWordTrie(my_dynamic_machine->trie_tree_dict);

	//TrieTreePrintTrieWords(my_dynamic_machine->trie_tree_dict);

	// because 'start' is the same ansestor to start and start2  the link to it is not deleted
	

	// haven't tested alternating inserts and deletes(appears to work)
	// haven't tested inserts and deletes on a complex graph
	// haven't done search
	// haven't done insert where a new dimention is added to the state
	//TrieTreeDeleteWords(my_dynamic_machine->trie_tree_dict, VectorAddStringToVector2("start2", "2"));
	//TrieTreePrintTrie(my_dynamic_machine->trie_tree_dict);
	//TrieTreePrintWordTrie(my_dynamic_machine->trie_tree_dict);
	//TrieTreePrintTrieWords(my_dynamic_machine->trie_tree_dict);



	
	
	

	//TrieTreePrintTrieWords(my_dynamic_machine->trie_tree_dict);

	exit(1);
	/*
	start
		start 1
			start 2
	another start
		2
	*/
	// passes
	//TrieTreePrintTrie(my_dynamic_machine->trie_tree_dict);
	//exit(1);
	// has data, partial match
	//Vector* name3 = VectorAddStringToVector2("start", "start 1");
	//name3 = TrieTreeInsertWords(my_dynamic_machine->trie_tree_dict, name3);
	//VectorPrintStrings(name3);
	//printf("\n");

	//TrieTreePrintTrie(my_dynamic_machine->trie_tree_dict);

	//TrieTreePrintTrieWords(my_dynamic_machine->trie_tree_dict);

	//exit(1);
	/*
	start
		start 1
			start 2
			2
	another start
		2
	*/
	// passes
	//TrieTreePrintTrie(my_dynamic_machine->trie_tree_dict);
	//exit(1);
	// has data, complete match 1
	// failed
	//Vector* name4 = VectorAddStringToVector3("start", "start 1", "2");
	//name4 = TrieTreeInsertWords(my_dynamic_machine->trie_tree_dict, name4);
	//VectorPrintStrings(name4);
	//printf("\n");
	//TrieTreePrintTrie(my_dynamic_machine->trie_tree_dict);

	//TrieTreePrintTrieWords(my_dynamic_machine->trie_tree_dict);

	//exit(1);

	//Vector* name5 = VectorAddStringToVector3("start", "start 1", "start 2");
	//name5 = TrieTreeInsertWords(my_dynamic_machine->trie_tree_dict, name5);
	//VectorPrintStrings(name5);
	//printf("\n");




	//TrieTreePrintTrie(my_dynamic_machine->trie_tree_dict);

	//TrieTreePrintTrieWords(my_dynamic_machine->trie_tree_dict);

	//exit(1);
	// delete what I have
	/*
	start
		start 1
			start 2
			2
				0
	another start
		2
	*/
	// passes
	// TrieTreePrintTrie(my_dynamic_machine->trie_tree_dict);
	// TrieTreePrintTrieRecursive(my_dynamic_machine->trie_tree_dict, 0, " ");
	// int key = TrieTreeDeleteWords(my_dynamic_machine->trie_tree_dict, VectorAddStringToVector2("start", "start 1"));
	// printf("key found %i\n", key);

	// key = TrieTreeDeleteWords(my_dynamic_machine->trie_tree_dict, VectorAddStringToVector2("another start", "2"));
	// printf("key found %i\n", key);
	// TrieTreePrintTrie(my_dynamic_machine->trie_tree_dict);

	// TrieTreePrintTrieRecursive(my_dynamic_machine->trie_tree_dict, 0, " ");


	//exit(1);
	/*
	// has data, complete match 2
	my_dynamic_machine->trie_tree_dict = insertState1(
		my_dynamic_machine->trie_tree_dict,
		VectorAddStringToVector3("start", "start 1", "2"),
					NULL,
					NULL,
					VectorCombineVectors(
							VectorAddStringToVector2("current_state", "children_flag"),
							VectorAddStringToVector2("current_state", "next_flag")),
					DataInitDataInt(50));
		TrieTreePrintTrie(my_dynamic_machine->trie_tree_dict);
	
	start
		start 1
			start 2
			2
				0
				1
	another start
		2

	
		
	// counterexample for making new contexts
	my_dynamic_machine->trie_tree_dict = insertState1(
		my_dynamic_machine->trie_tree_dict,
		VectorAddStringToVector1("start"),
					NULL,
					NULL,
					VectorCombineVectors(
							VectorAddStringToVector2("current_state", "children_flag"),
							VectorAddStringToVector2("current_state", "next_flag")),
					DataInitDataInt(50));
		TrieTreePrintTrie(my_dynamic_machine->trie_tree_dict);
	
	
	start
		start 1
			start 2
			2
				0
				1
		1
	another start
		2

	
	// has data, but completely different path
	// has data, input string is a subpath
	// has data, input string is longer than any subpath

	
	my_dynamic_machine = insertState1(
		my_dynamic_machine,
		VectorAddStringToVector2("start 3", "2"),
					NULL,
					NULL,
					VectorCombineVectors(
							VectorAddStringToVector2("current_state2", "children_flag2"),
							VectorAddStringToVector2("current_state2", "next_flag2")),
					DataInitDataFloat(9.6));
	
	
	my_dynamic_machine = insertState1(
		my_dynamic_machine,
		VectorAddStringToVector1("start"),
					NULL,
					NULL,
					VectorCombineVectors(
							VectorAddStringToVector2("current_state2", "children_flag2"),
							VectorAddStringToVector2("current_state2", "next_flag2")),
					DataInitDataFloat(9.7));
	
	// test unique states
	// test unique state edges
	// calculator simulator
	
	take in text

	output the value

	1)
		convert the text to a list of units
	2)
		run order of operations on the list of units in place


	*/
	/*bool insertState1(	Vector* name, // strings
					Vector** start_children,  // array of strings
					Vector** children, // array of strings
					Vector** next_states, // array of strings
					Data* value) // primitive
	*/
	//printf("%s\n", my_scanner->input);
	//ContextState* tree = makeTree(input);
	//printf("made tree\n");
	//printTree(tree, 0);
	//const char* parsing_graph = readFile(argv[1]);
	//printf("%s\n", parsing_graph);
	// the parser code appears to compile
	//const int number_of_tokens = 10000;
	//jsmn_parser parser;
	//jsmntok_t tokens[number_of_tokens];

	//jsmn_init(&parser);
	//jsmnerr_t parsing_results;
	//parsing_results = jsmn_parse(&parser,
	//							 parsing_graph,
	//							 (size_t) strlen(parsing_graph),
	//							 tokens,
	//							 number_of_tokens
	//							 );
	/*
		typedef struct TrieNode
		{

			char* word;
			struct TrieNode** neighbors;
			int neighbors_count;

			int size;  // factor of 2
			struct ContextState* object;
		}TrieNodee;

	
	*/
	//TrieNode* root = malloc(sizeof(TrieNode));
	//char* root_word = "root";

	//root->word = malloc(sizeof(char) * 5);
	//memcpy(root->word, root_word, sizeof(char) * 5);
	//root->neighbors = NULL;
	//root->neighbors_count = 0;
	//root->object = 0;
	//root->size = 0;



	//TrieNode* functions_root = malloc(sizeof(TrieNode));
	//char* functions_root_word = "functions_root";

	//functions_root->word = malloc(sizeof(char) * 15);
	//memcpy(functions_root->word, functions_root_word, sizeof(char) * 15);
	//functions_root->neighbors = NULL;
	//functions_root->neighbors_count = 0;
	//functions_root->object = 0;
	//functions_root->size = 0;
	// searching for the state in the trie can take n time
	
	// finding the right function to add to the state can take n time
	// visitor function n^2, because n states will be visited and potentially all the state names have to be checked to reach the state for each state
	// make a state
	// convert function name string into a trienode pointing to trinode holding the state
	// add the trienode chain to the state
	// put the function pointer to the state
	// add the state to the functions dict via functions_root

	//printf("%i\n", parsing_results);
	/*
		typedef struct {
			jsmntype_t type;
			int start;
			int end;
			int size;
		#ifdef JSMN_PARENT_LINKS
			int parent;
		#endif
		} jsmntok_t;

		typedef enum {
			JSMN_PRIMITIVE = 0,
			JSMN_OBJECT = 1,
			JSMN_ARRAY = 2,
			JSMN_STRING = 3
		} jsmntype_t;

	*/

	//printf("%i\n", _primitive);
	//printf("%i\n", parsing_results);
	//exit(1);
	//Tokens* my_tokens = makeTokens(tokens, parsing_graph, parsing_results);

	//int insert_count = 0;
	//while(!noTokensLeft(my_tokens))
	//{

	//	printf("%i\n", i);
	//	int json_type = getToken(my_tokens).type;
	//	if(json_type == 0)
	//	{
	//		printf("primitive\n");
			 //i++;
	//		 advanceToken(my_tokens);
	//	}
	//	else if(json_type == 1)
	//	{

			// how do I know when I'm on the last token?
	//		if(!noTokensLeft(my_tokens))
	//		{
				//printf("object to run %i\n", getI(my_tokens));

				//printf("|%s|\n", collectChars(tokens[i], parsing_graph));
				// n objects * n function names to check through = n^2
	//			ContextState* state = makeContextState(/*&i, tokens, parsing_graph*/my_tokens, parsing_results);
				//exit(1);
				//printf("printing state\n\n");
				//printContextState(state);
	//			if(root != NULL)
	//			{
					
					// for state_name the root is a dummy node
	//				insert2(root, state->state_name->neighbors[0], state);
	//				insert_count++;
					//printTrieNodeTree(root, 1);

					//printf("here\n");
	//			}
				

				//void addToTrie(TrieNode* root, ContextState* state)
				//advanceToken(my_tokens);
				
	//		}
			
			//exit(2);

	//	}
	//	else if(json_type == 2)
	//	{
	//		printf("array\n");
			 //i++;

 	//		 advanceToken(my_tokens);

	//	}
	//	else if(json_type == 3)
	//	{
	//		printf("string\n");
			 //i++;

 	//		 advanceToken(my_tokens);

	//	}
		// to ensure machines can't alter each other's data only allow the current machine to be passed to each function
		// how can a machine indirectly alter another machine?
		// https://stackoverflow.com/questions/2672015/hiding-members-in-a-c-struct
		// https://mattferderer.com/what-is-the-actor-model-and-when-should-you-use-it
		//printf("|%s|\n", collectChars(tokens[i], parsing_graph));
	//}
	//if(root->neighbors != NULL)
	//{
		
	//	printf("printing tree\n");
	//	printTrieNodeTree(root, 1);
	//	printf("\n");
	//}
	//printf("done\n");
	//ContextState* test = makeFullContextState2(NULL, NULL,
	//NULL,
	//NULL,
	//NULL,
	//NULL,
	//NULL,
	//returnTrue,
	//0,
	//0,
	//0,
	//0,
	//0,
	//0,
	//0,
	//0);
	//test->function_pointer(tree);
	//printf("%lu\n", sizeof(ContextState));
	//visitor(root, NULL, NULL);

	// loop untill hit object
	// call makeContextState on object
	/*
	jsmnerr_t jsmn_parse(jsmn_parser *parser,
						 const char *js,
						 size_t len,
						 jsmntok_t *tokens,
						 unsigned int num_tokens) {
	*/

	//ht_hash_table* parsing_states = ht_new();
/*
history tree
control flow tree
persistent data tree
start
	next
		(current_state.children_flag | current_state.next_flag)
nth state that passes
current_state.children_flag
	init
		next
			setup first set of next states
	first_state
		next
			try one
		function
			current_state.children_flag is true and it's the first state tried
				set first state as child of bottom_trackers.children[current_state]
				replace the ith child in bottom_trackers.children with first state
				set first state as child of history_bottom_trackers.children[current_state]
				doubly link child with parent

	nth_state
		function
			current_state.children_flag is true and it's the nth state tried
				add nth state as a branch child of bottom_trackers.children[current_state]
				insert the ith child in bottom_trackers.children the nth value + i 
				set nth state as branch child of history_bottom_trackers.children[current_state]
				doubly link child with parent

setup first set of next states
	next
		is there anything in the set, run the set of next states
is there anything in the set
	next
		run the set of next states
run the set of next states
	children
		variables
			children
				pass_counter
				total_next_states
				kind of next states
					data
						"nexts"
		-parallel
			next
				(try one | current run fails)
		try one
			next
				(first_state_tried | nth_state_tried)
		first_state_tried
			next
				current_state.children_flag / first_state
		nth_state_tried
			next
				current_state.children_flag / nth_state
		current run fails
			nexts
				(not all failed | all fail)
			function
		not all failed
			nexts
				try one
		all fail
			nexts
				
			function
				current state is removed and the parent state's # of passing states -= 1
				traverse up untill the current states parent says all the children are not parallel
				then continue with the nth + 1 child state not tested yet

		-non-parallel
			try all untill first true one is found
			if a child
				make new level
			if a next
				go to next state
parallel(if the child state fails then it's removed)
current state name
ith next state tried
children states passed
next states passed
number of next states passed
number of chilren states passed
*/

	return 0;
}

