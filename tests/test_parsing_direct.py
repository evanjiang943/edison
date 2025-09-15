#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Set up environment
os.environ['OPENAI_API_KEY'] = 'test-key-not-configured'
os.environ['DATABASE_URL'] = 'sqlite:///./autograder.db'
os.environ['SECRET_KEY'] = 'test-secret'
os.environ['REDIS_URL'] = 'redis://localhost:6379/0'

from backend.app.services.llm_service import LLMService

def test_parsing():
    print("Testing LLM service parsing...")
    
    # Read the test files
    with open('test_assignment.tex', 'r') as f:
        assignment_content = f.read()
    
    with open('test_answer_key.tex', 'r') as f:
        answer_key_content = f.read()
    
    with open('test_rubric.tex', 'r') as f:
        rubric_content = f.read()
    
    print("File lengths:")
    print(f"  Assignment: {len(assignment_content)} chars")
    print(f"  Answer Key: {len(answer_key_content)} chars")
    print(f"  Rubric: {len(rubric_content)} chars")
    print()
    
    # Create LLM service
    llm_service = LLMService()
    
    # Parse each document
    documents = {
        "assignment": (assignment_content, "assignment"),
        "answer_key": (answer_key_content, "answer_key"),
        "rubric": (rubric_content, "rubric")
    }
    
    for doc_name, (content, doc_type) in documents.items():
        print(f"Parsing {doc_name}...")
        try:
            result = llm_service.parse_document(content, doc_type)
            
            print(f"  Document type: {result.document_type}")
            print(f"  Questions found: {len(result.questions)}")
            
            total_parts = sum(len(q.parts) for q in result.questions)
            total_points = sum(q.max_points for q in result.questions) + sum(sum(p.max_points for p in q.parts) for q in result.questions)
            
            print(f"  Total parts: {total_parts}")
            print(f"  Total points: {total_points}")
            
            for i, question in enumerate(result.questions):
                print(f"    Q{question.id}: {question.max_points} pts, {len(question.parts)} parts")
                if question.question_text:
                    print(f"      Question: {question.question_text[:100]}...")
                if question.answer_text:
                    print(f"      Answer: {question.answer_text[:100]}...")
                if question.rubric_text:
                    print(f"      Rubric: {question.rubric_text[:100]}...")
                
                for part in question.parts:
                    print(f"        Part {part.id}: {part.max_points} pts")
                    if part.question_text:
                        print(f"          Question: {part.question_text[:80]}...")
                    if part.answer_text:
                        print(f"          Answer: {part.answer_text[:80]}...")
                    if part.rubric_text:
                        print(f"          Rubric: {part.rubric_text[:80]}...")
            print()
            
        except Exception as e:
            print(f"  Error: {e}")
            import traceback
            traceback.print_exc()
            print()

if __name__ == "__main__":
    test_parsing()
