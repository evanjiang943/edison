#!/usr/bin/env python3

import re

def test_regex_parsing():
    # Read the test assignment file
    with open('test_assignment.tex', 'r') as f:
        content = f.read()
    
    print("Original content length:", len(content))
    print("First 500 chars:")
    print(content[:500])
    print("\n" + "="*50 + "\n")
    
    # Look for section patterns like \section{Question 1} or \section{Q1}
    section_pattern = r'\\section\{(?:Question\s*|Q|Problem\s*)(\d+)\}'
    sections = list(re.finditer(section_pattern, content, re.IGNORECASE))
    
    print(f"Found {len(sections)} sections with pattern: {section_pattern}")
    for i, match in enumerate(sections):
        print(f"Section {i+1}: Question {match.group(1)} at position {match.start()}-{match.end()}")
        print(f"  Match text: '{match.group(0)}'")
    
    if not sections:
        print("No sections found, trying fallback patterns...")
        # Fallback: look for numbered questions
        question_patterns = [
            r'\n\s*(\d+)\.?\s+',  # "1. " or "1 "
            r'\n\s*Question\s+(\d+)',  # "Question 1"
            r'\n\s*Problem\s+(\d+)',  # "Problem 1"
        ]
        
        for pattern in question_patterns:
            matches = list(re.finditer(pattern, content, re.IGNORECASE))
            print(f"Pattern '{pattern}' found {len(matches)} matches")
            if matches:
                for match in matches[:3]:  # Show first 3
                    print(f"  Match: '{match.group(0).strip()}' -> Question {match.group(1)}")
                sections = matches
                break
    
    print(f"\nProcessing {len(sections)} questions...")
    
    for i, match in enumerate(sections):
        question_num = match.group(1)
        start_pos = match.end()
        
        # Find the end position (start of next section or end of document)
        if i + 1 < len(sections):
            end_pos = sections[i + 1].start()
        else:
            end_pos = len(content)
        
        # Extract the content between sections
        question_content = content[start_pos:end_pos].strip()
        
        print(f"\nQuestion {question_num}:")
        print(f"  Content length: {len(question_content)}")
        print(f"  First 200 chars: {question_content[:200]}...")
        
        # Look for enumerated parts like (a), (b) or \item[(a)]
        part_pattern = r'\\item\[?\(?([a-z])\)?\]?|^\s*\(?([a-z])\)\s*'
        part_matches = list(re.finditer(part_pattern, question_content, re.MULTILINE | re.IGNORECASE))
        
        print(f"  Found {len(part_matches)} parts")
        for j, part_match in enumerate(part_matches):
            part_id = part_match.group(1) or part_match.group(2)
            print(f"    Part {part_id}: '{part_match.group(0).strip()}'")

if __name__ == "__main__":
    test_regex_parsing()
