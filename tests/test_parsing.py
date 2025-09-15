#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app.services.llm_service import parse_assignment_documents

def test_parsing():
    # Read the test files
    with open('test_assignment.tex', 'r') as f:
        assignment_content = f.read()
    
    with open('test_answer_key.tex', 'r') as f:
        answer_key_content = f.read()
    
    with open('test_rubric.tex', 'r') as f:
        rubric_content = f.read()
    
    print("Testing parsing with the following content lengths:")
    print(f"Assignment: {len(assignment_content)} chars")
    print(f"Answer Key: {len(answer_key_content)} chars")
    print(f"Rubric: {len(rubric_content)} chars")
    print()
    
    # Parse the documents
    try:
        results = parse_assignment_documents(
            assignment_content=assignment_content,
            answer_key_content=answer_key_content,
            rubric_content=rubric_content
        )
        
        print("Parsing Results:")
        print(f"Keys: {list(results.keys())}")
        
        for key, result in results.items():
            if result:
                print(f"\n{key.upper()}:")
                print(f"  Document type: {result.document_type}")
                print(f"  Number of questions: {len(result.questions)}")
                
                for i, question in enumerate(result.questions):
                    print(f"  Question {question.id}:")
                    print(f"    Max points: {question.max_points}")
                    print(f"    Question text: {question.question_text[:100]}...")
                    print(f"    Answer text: {question.answer_text[:100]}...")
                    print(f"    Rubric text: {question.rubric_text[:100]}...")
                    print(f"    Parts: {len(question.parts)}")
                    
                    for part in question.parts:
                        print(f"      Part {part.id}: {part.max_points} points")
                        if part.question_text:
                            print(f"        Question: {part.question_text[:50]}...")
                        if part.answer_text:
                            print(f"        Answer: {part.answer_text[:50]}...")
                        if part.rubric_text:
                            print(f"        Rubric: {part.rubric_text[:50]}...")
            else:
                print(f"\n{key.upper()}: No content")
                
    except Exception as e:
        print(f"Error during parsing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_parsing()
