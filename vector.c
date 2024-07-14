#include "vector.h"

typedef struct Edge2 {
	int point_id;
	int line_id;
}Edge2;

typedef struct Point2 {
	int point_id;
	int line_id;
	Vector* parents;
	struct Point2* prev;
	struct Point2* next;
}Point2;
/*
typedef struct Vector
{
	void** values;
	int size;
	int population;

	// special window variables for the recording user changes system
	int first;
	int last;


}Vector;
// */

Vector* VectorInitVector()
{
	// printf("VectorInitVector\n");
	Vector* new_container = (Vector*) malloc(sizeof(Vector));
	new_container->values = NULL;
	new_container->size = 0;
	new_container->population = 0;

	new_container->start = 0;
	new_container->end = 0;
	// new_container->is_empty = true;
	// from C's point of view new_container == NULL

	return new_container;
}
Vector* VectorInitVectorSize(int size)
{
	if(size < 0)
	{
		return NULL;
	}
	Vector* new_container = (Vector*) malloc(sizeof(Vector) * size);
	new_container->values = (void**) malloc(sizeof(void*) * size);
	new_container->size = size;
	new_container->population = 0;
	new_container->start = 0;
	new_container->end = 0;
	// new_container->is_empty = true;
	return new_container;
}
bool VectorDeleteVector(Vector* container)
{
	if(container == NULL)
	{
		return false;
	}
	for(int i = container->start; i < container->end; i++)
	{
		free(container->values[i]);
		container->values[i] = NULL;
	}
	free(container->values);
	container->values = NULL;
	container->population = 0;
	// container->is_empty = true;
	return true;
}
Vector* VectorCopyVector(Vector* my_vector)
{
	Vector* new_vector = VectorInitVector();
	for(int i = my_vector->start; i < my_vector->end; i++)
	{
		int integer_to_append = *((int*) VectorGetItem(my_vector, i));
		VectorAppendInt(new_vector, integer_to_append);
	}
	return new_vector;
}

int VectorGetLastIndex(Vector* container)
{
	if(container == NULL)
	{
		return -1;
	}
	return container->end - 1;
}
// for unsorted only
void* VectorGetItem(Vector* container, int i)
{
	if(container == NULL)
	{
		return NULL;

	}
	// printf("VectorGetItem start %i\n", container->start);
	// printf("getting item %i, %i\n", i, container->population);
	if(container->population == 0)
	{
		printf("container is empty\n");
		return NULL;
	}
	else if(i < container->end && i >= container->start)
	{
		// printf("item |%i|\n", container->values[i]);
		return container->values[i];
	}
	else
	{
		printf("out of bounds\n");
		return NULL;
	}

}

void* VectorGetPoint2WithNextId(Vector* container, int next_line_id)
{
	if(container == NULL)
	{
		return NULL;

	}
	if(container->population == 0)
	{
		printf("container is empty\n");
		return NULL;
	}	
	for (int i = container->start; i < container->end; i++) {
		Point2* item = (Point2*) container->values[i];
		if (item == NULL) {
			continue;
		}
		else if (item->next == NULL) {
			continue;
		}
		if (item->next->line_id == next_line_id) {
			return item;
		}
	}
	printf("out of bounds\n");
	return NULL;

}
int VectorGetPopulation(Vector* container)
{
	if(container == NULL)
	{
		return 0;
	}
	return container->population;
}
int VectorGetEnd(Vector* container)
{
		if(container == NULL)
	{
		return -1;
	}
	return container->end;

}
void VectorAppendInt(Vector* container, int element)
{
	// printf("adding an integer\n");

	if(container == NULL)
	{
		return;
	}
	int* element_ptr = (int*) malloc(sizeof(int));
	*element_ptr = element;
	VectorAppend(container, element_ptr);
}
void VectorAppend(Vector* container, void* element)
{
	if(container == NULL)
	{
		return;
	}
	// printf("VectorAppend start %i\n", container->start);

	//printf("TrieTreePush %i, size %i\n", container->population, container->size);

	if(container->size == 0)
	{
		//printf("insert 0\n");
		container->values = (void**) malloc(sizeof(void*));
		container->size = 1;
		container->values[0] = element;
		// container->start++;

	}
	else if(container->end == container->size)
	{

		// printf("size %i\n", container->size);
		container->size *= 2;

		container->values = (void**) realloc(container->values, sizeof(void*) * container->size);
	}

	container->values[container->end] = element;
	container->population++;
	
	container->end++;
	// printf("VectorAppend end start %i\n", container->start);

	// container->is_empty = false;
		//printf("result\n");
		//VectorPrint(container);

}

// bool VectorPopItem(Vector* container)
// {
// 	if(container == NULL)
// 	{
// 		return false;
// 	}
// 	//printf("here %i\n", container->population - 1);
// 	//VectorPrint(container);

// 	int index = container->end - 1;
// 	free(container->values[index]);
// 	container->values[index] = NULL;

// 	container->population -= 1;
// 	container->end--;

// 	//VectorPrint(container);
// 	return true;
// ;
// }
bool VectorPopFirst(Vector* container)
{
	if(container == NULL)
	{
		return false;
	}
	return VectorDeleteItem(container, 0);
}
bool VectorDeleteItem(Vector* container, int index)
{
	// needs a special delete function for the object type
	// printf("delete at %i\n", index);
	// set container[index] to null
	// shift all values from [index + 1, end] to the left by 1
	if(container == NULL)
	{
		return false;
	}
	//printf("%i\n", container->population);
	//printf("%i\n", index);
	//int* x = (int*) container->values[index];
	//printf("%i\n", *x);
	free(container->values[index]);
	container->values[index] = NULL;
	if(index < container->end)
	{
		// printf("%i %i\n", index + 1, container->population);
		for(int i = index + 1; i < container->end; i++)
		{
			container->values[i - 1] = container->values[i];

			container->values[i] = NULL;

		}
		// VectorPrint(container);

		container->population--;
		container->end--;

		// printf("%i\n", container->population);
	}
	return true;

}
// bool VectorDeleteAllItems(Vector* container)
// {
// 	// assuems all elements are primitives
// 	if(container == NULL)
// 	{
// 		return false;
// 	}
// 	for(int i = 0; i < container->population; i++)
// 	{
// 		free(container->values[i]);
// 		container->values[i] = NULL;
// 	}
// 	free(container->values);
// 	container->values = NULL;
// 	free(container);
// 	container = NULL;
// 	return true;
// }
bool VectorDeleteAllItems2(Vector* container)
{
	// assuems all elements are primitives
	if(container == NULL)
	{
		return false;
	}
	for(int i = container->start; i < container->end; i++)
	{
		free(container->values[i]);
		container->values[i] = NULL;
	}
	free(container->values);
	container->values = NULL;
	container->population = 0;
	container->size = 0;
	container->start = 0;
	container->end = 0;
	// free(container);
	// container = NULL;
	return true;
}

void VectorShiftItems(Vector* container, int index)
{
	if(container == NULL || index >= container->end)
	{
		return;
	}

	for(int i = index + 1; i < container->end; i++)
	{
		container->values[i - 1] = container->values[i];

		container->values[i] = NULL;

	}
	// container->population--;
	container->end--;
	
}

void VectorShiftLeft(Vector* container)
{
	//printf("insert location bounds %i %i\n", start, end);
	if(container == NULL)
	{
		return;
	}
	// printf("VectorShiftLeft start %i\n", container->start);
	container->size++;
	container->values = (void**) realloc(container->values, sizeof(void*) * container->size);
	container->values[container->end] = NULL;

	container->end++;
	// if(container->end <= start + 1)
	// {
	// 	return;
	// }
	// // assume start >= end
	// // assume container size > start+1
	// for(int i = start + 1; i >= end; i--)
	// {
	// 	container->values[i] = container->values[i - 1];

	// }
	//container->values[start] = NULL;
}

void VectorShiftRight(Vector* container, int index)
{
	// extend the vector by 1 unit if we are on the last index
	// assume the user will use VectorSetInt next
	// printf("VectorShiftRight\n");
	// printf("index %i\n", index);
	// container->end == container->size instead
	// printf("VectorShiftRight start %i\n", container->start);
	int end = container->end;
	// printf("end %i, size %i\n", container->end, container->size);
	if(container->end == container->size)
	{
		// printf("in deep shit\n");
		container->size += 1;

		// ads another block of memeory to the right end of the array
		container->values = (void**) realloc(container->values, sizeof(void*) * container->size);

		// int* element_ptr = (int*) malloc(sizeof(int));
		// *element_ptr = 20;

		container->values[container->end] = NULL;

		// changing the order of items in array should not affect the total items being counted
		// a variable measuring the last index used in the array should be used instead
		// container->population += 1;
		container->end++;
		end = container->end - 1;

	}
	// will fail if the container doesn't need to be resized
	// printf("before shift\n");
	// for(int i = 0; i < VectorGetEnd(container); i++)
    // {
    //     int key = ((int*) VectorGetItem(container, i));

    //     printf("|%i|", key);
    // }
	// printf("\n");
	// i > index not i >= index is vital or we will accidentally shift ouside our intended bounds
	// start 1 place after the last known item so we guarantee we are shifting all item within the range
	// int i = container->end
	// we want the position 
	// printf("start %i, end %i\n", index, container->end - 1);
	for(int i = end; i > index; i--)
	{
		// printf("%i <= %i\n", i, i - 1);
		container->values[i] = container->values[i - 1];
		// printf("i %i value %i\n", i, ((int*) container->values[i]));
		container->values[i - 1] = NULL;
	}
	// this function comes before VectorSetInt so we don't want to adjust begin
	// as we are making space for the new item to be inserted.
	// index + 1 is the new start
	// printf("start %i, index %i\n", container->start, index);
	// if(container->start == index)
	// {
	// 	container->start++;
	// }
	// printf("0 value %i\n", ((int*) container->values[0]));
	// printf("1 value %i\n", ((int*) container->values[1]));


	// printf("after shift %i, %i\n", 0, VectorGetEnd(container) - 1);
	// for(int i = 0; i < VectorGetEnd(container); i++)
    // {
	// 	printf("i %i ", i);
    //     int key = ((int*) VectorGetItem(container, i));

    //     printf("|%i|\n", key);
    // }
	// printf("\n");

}
/*
VectorShiftRight start -1
VectorSetInt start -1
*/
void VectorSetInt(Vector* container, int element, int i)
{
	if(container == NULL)
	{
		return;
	}
	// printf("VectorSetInt start %i\n", container->start);
	// printf("set int %i %i \n", i, container->end);
	if(i < container->end && i >= 0)
	{
		// printf("item |%i|\n", container->values[i]);
		if(container->values[i] == NULL)
		{
			// printf("adjusting the population\n");
			container->population++;
			// is this needed?
			if(container->population == 1)
			{
				container->start = 0;
			}
		}
		int* element_ptr = (int*) malloc(sizeof(int));
		*element_ptr = element;
		container->values[i] = element_ptr;

	}

}
void VectorSet(Vector* container, void* element, int i)
{
	if(container == NULL)
	{
		return;
	}

	// printf("set value at %i \n", i);
	if(i < container->end && i >= 0)
	{
		// printf("item |%i|\n", container->values[i]);
		if(container->values[i] == NULL)
		{
			// printf("adjusting the population\n");
			container->population++;

			// is this needed?
			if(container->population == 1)
			{
				container->start = 0;
			}
		}
		container->values[i] = element;

	}
	// printf("after set %i, %i\n", 0, VectorGetEnd(container) - 1);
	// for(int i = 0; i < VectorGetEnd(container); i++)
    // {
	// 	printf("i %i ", i);
    //     int key = ((int*) VectorGetItem(container, i));

    //     printf("|%i|\n", key);
    // }
	// printf("\n");


}

void VectorReset(Vector* container)
{
	// printf("size %i, population %i, start %i, end %i\n",
	// 		container->size,
	// 		container->population,
	// 		container->start,
	// 		container->end);
	for(int i = container->start; i < container->end; i++)
    {
        free(container->values[i]);
    }
    container->values = (void**) malloc(sizeof(void*));
    container->population = 0;
    container->size = 0;
	container->start = 0;
	container->end = 0;
	// this function works becuase it always comes before VectorSetInt which ensures start > -1


}
void VectorPrint(Vector* container)
{
	if(container == NULL)
	{

		printf("empty container\n");
		return;
	}
	// printf("printing container pop %i, size %i\n", container->population, container->size);
	for(int i = container->start; i < container->end; i++)
	{
		//printf("i %i\n", i);
		if(container->values[i] == NULL)
		{
			printf("|NULL|\n");
		}
		else
		{
			//printf("|%x|", container->values[i]);
			void* a = container->values[i];
			int* b = (int*) a;
			printf("|%i|", *b);
			
			//printf("|item|");
		}
	}
	if(container->population == 0)
	{
		printf("none");
	}
	printf("\n\n");
	

}

void VectorPrintPoint2(Vector* container)
{
	if(container == NULL)
	{

		printf("empty container\n");
		return;
	}
	// printf("printing container pop %i, size %i\n", container->population, container->size);
	for(int i = container->start; i < container->end; i++)
	{
		//printf("i %i\n", i);
		if(container->values[i] == NULL)
		{
			printf("|NULL|\n");
		}
		else
		{
			//printf("|%x|", container->values[i]);
			void* a = container->values[i];
			Point2* b = (Point2*) a;
			printf("|%i|%i|", b->line_id, b->point_id);
			Point2* b_prev = b->prev;
			if (b_prev == NULL) {
				printf("prev:|NULL|");
			}
			else {
				printf("prev:|%i|%i|", b_prev->line_id, b_prev->point_id);
			}
			Point2* b_next = b->next;
			if (b_next == NULL) {
				printf("next:|NULL|\n");
			}
			else {
				printf("next:|%i|%i|\n", b_next->line_id, b_next->point_id);
			}


			//printf("|item|");
		}
	}
	if(container->population == 0)
	{
		printf("none");
	}
	printf("\n\n");
	

}

void VectorPrintInts(Vector* container)
{
	if(container == NULL)
	{

		printf("empty container\n");
		return;
	}
	// printf("printing container pop %i, size %i\n", container->population, container->size);
	for(int i = container->start; i < container->end; i++)
	{
		//printf("i %i\n", i);
		if(container->values[i] == NULL)
		{
			printf("|NULL|\n");
		}
		else
		{
			//printf("|%x|", container->values[i]);
			void* a = container->values[i];
			int* b = (int*) a;
			printf("|%i|", *b);
			
			//printf("|item|");
		}
	}
	if(container->population == 0)
	{
		printf("none");
	}
	// printf("\n\n");
	

}
void VectorPrintIntsAsChars(Vector* container)
{
	if(container == NULL)
	{

		printf("empty container\n");
		return;
	}
	printf("|");
	for(int i = container->start; i < container->end; i++)
	{
		//printf("i %i\n", i);
		if(container->values[i] == NULL)
		{
			printf("|NULL|\n");
		}
		else
		{
			//printf("|%x|", container->values[i]);
			void* a = container->values[i];
			int* b = (int*) a;
			// the char equivalent may not be veiwable or may display in an unexpected way
			// it prints fine if it's printing as an integer
			printf("%c", *b);
			
			//printf("|item|");
		}
	}
	printf("|");
	// printf("printing container pop %i, size %i\n", container->population, container->size);
	


	if(container->population == 0)
	{
		printf("none");
	}
	printf("\n");
	

}

// void VectorPrintVectorOfStrings(Vector* container)
// {
// 	if(container == NULL)
// 	{
// 		return;
// 	}
// 	// assume we are passing in a vector of vectors of strings
// 	for(int i = 0; i < VectorGetPopulation(container); i++)
// 	{
// 		Vector* inner_container = (Vector*) VectorGetItem(container, i);
// 		VectorPrintStrings(inner_container);
// 	}
// }

// dict methods
// binsearch (return the integer of the missing item * -1 so the search can detect it's not found
		// compare(Vector* outer_vector, void* a, void* b) -> bool
// bool VectorBinSearch(Vector* outer_vector, Vector* vector, Vector* target, void (*function)(Vector* outer_vector, Vector* vector, void* a, void* b))
// {
	// assume vector[0] == NULL

	// search for index of target in vector
		// return a negative value showing position of insert if not found
		// return a positive value if found
// }
// and insert can know where to put it (missing index * -1) make 0 an invalid index)
// insert new items
// shift [i, end] items to the right
// store at i
// O(nlogn) is acceptable for now(contextual state chart version 1 just needs dict algorithms < n^2)
void VectorTest()
{
	// make a vector
	Vector* my_vector = VectorInitVector();

	// add a list of numbers

	int* a = (int*) malloc(sizeof(int));
	*a = 0;
	VectorAppend(my_vector, a);
	VectorPrint(my_vector);
	int* b = (int*) malloc(sizeof(int));
	*b = 1;
	VectorAppend(my_vector, b);
	VectorPrint(my_vector);

	int* c = (int*) malloc(sizeof(int));
	*c = 2;
	VectorAppend(my_vector, c);
	VectorPrint(my_vector);

	int* d = (int*) malloc(sizeof(int));
	*d = 2;
	VectorAppend(my_vector, d);
	VectorPrint(my_vector);


	VectorDeleteItem(my_vector, 1);
	VectorPrint(my_vector);
	VectorDeleteItem(my_vector, 2);
	VectorPrint(my_vector);

	VectorDeleteItem(my_vector, 0);
	VectorPrint(my_vector);

	VectorDeleteItem(my_vector, 0);
	VectorPrint(my_vector);	
	
	// erase a list of numbers
}

Vector* VectorMakeVectorOfChars(char* my_string)
{
	Vector* list_of_chars = VectorInitVector();

	for(int i = 0; i < strlen(my_string); i++)
	{
		int* char_ptr = (int*) malloc(sizeof(int));
		*char_ptr = my_string[i];
		// printf("%i\n", my_string[i]);
		VectorAppend(list_of_chars, char_ptr);
	}

	// printf("we are here\n%s\n", my_string.c_str());
	// VectorPrint(list_of_chars);
	// printf("done\n");
	return list_of_chars;

}
Vector* VectorConvertIntToVectorOfInts(int my_value)
{

	if(my_value < 0)
	{
		printf("VectorConvertIntToVectorOfInts only accepts an integer in the range of [0, n]\n");
		return NULL;
	}
	Vector* list_of_integers = VectorInitVector();

	while(my_value > 0)
	{
		int last_digit = my_value % 10;
		VectorShiftRight(list_of_integers, 0);
		VectorSetInt(list_of_integers, last_digit, 0);
		my_value /= 10;
	}
	return list_of_integers;
	// void VectorShiftRight(Vector* container, int index)
	// void VectorSetInt(Vector* container, int element, int i)

}
Vector* VectorMakeVectorOfVectorsOfChars(int arg_count, ...)
{
	Vector* list_of_vectors = VectorInitVector();
	
	va_list ap;

	va_start(ap, arg_count);
	for(int i = 0; i < arg_count; i++)
	{
		Vector* current_arg = va_arg(ap, Vector*);
		VectorAppend(list_of_vectors, current_arg);
	}
	return list_of_vectors;
}