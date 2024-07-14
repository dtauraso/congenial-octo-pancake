#ifndef VECTOR
#define VECTOR
#include "standard_headers.h"

typedef struct Vector
{
	void** values;
	int size;
	int population;

	// so I can instantiate vectors and C will not treat them as NULL
	// bool is_empty;

	// special window variables for the recording user changes system
	// [start, end)
	int start;
	int end;

	// use start and end to indicate the range of data focused on in a slice as nothing is deleted
	// untill after the state function finishes collecting the user changes 
	// any deleted items can just use the deleted flag in the state attribute


}Vector;

Vector* VectorInitVector();
Vector* VectorInitVectorSize(int size);

bool VectorDeleteVector(Vector* container);
Vector* VectorCopyVector(Vector* my_vector);

int VectorGetLastIndex(Vector* container);
void* VectorGetItem(Vector* container, int i);
void* VectorGetPoint2WithNextId(Vector* container, int next_id);

int VectorGetPopulation(Vector* container);
int VectorGetEnd(Vector* container);

void VectorAppendInt(Vector* container, int element);
// void VectorAppendString(Vector* container, string element);

void VectorAppend(Vector* container, void* element);
void VectorSetInt(Vector* container, int element, int i);
void VectorReset(Vector* container);


bool VectorPopItem(Vector* container);
bool VectorPopFirst(Vector* container);


bool VectorDeleteItem(Vector* container, int index);
// bool VectorDeleteAllItems(Vector* container);
bool VectorDeleteAllItems2(Vector* container);
void VectorShiftItems(Vector* container, int index);


void VectorShiftLeft(Vector* container);
void VectorShiftRight(Vector* container, int index);
void VectorSetInt(Vector* container, int element, int i);


void VectorSet(Vector* container, void* element, int i);


void VectorTest();


void VectorPrint(Vector* container);
void VectorPrintPoint2(Vector* container);
void VectorPrintInts(Vector* container);
void VectorPrintIntsAsChars(Vector* container);


void VectorPrintVectorOfStrings(Vector* container);

// void VectorPrintStrings(Vector* container);

Vector* VectorMakeVectorOfChars(char* my_string);
Vector* VectorConvertIntToVectorOfInts(int my_value);

Vector* VectorMakeVectorOfVectorsOfChars(int arg_count, ...);

// Vector* VectorAddStringToVector1(string string_1);
// Vector* VectorAddStringToVector2(string string_1, string string_2);

// Vector* VectorAddStringToVectorGeneral(string strings[], int size);


Vector* VectorCombineVectors1(Vector* source_1);

Vector* VectorCombineVectors2(Vector* source_1, Vector* source_2);


Vector* VectorCombineVectorsGeneral(Vector* vectors[], int size);

#endif