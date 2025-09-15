#!/usr/bin/env python3

import re

def clean_latex_content(content):
    """Clean LaTeX content by removing common preamble and document structure"""
    
    # Remove document class and preamble
    content = re.sub(r'\\documentclass.*?\n', '', content)
    content = re.sub(r'\\usepackage.*?\n', '', content, flags=re.MULTILINE)
    content = re.sub(r'\\title.*?\n', '', content)
    content = re.sub(r'\\author.*?\n', '', content)
    content = re.sub(r'\\date.*?\n', '', content)
    content = re.sub(r'\\maketitle.*?\n', '', content)
    
    # Remove document environment tags
    content = re.sub(r'\\begin\{document\}', '', content)
    content = re.sub(r'\\end\{document\}', '', content)
    
    return content.strip()

def test_latex_cleaning():
    # Read the test assignment file
    with open('test_assignment.tex', 'r') as f:
        original_content = f.read()
    
    print("Original content length:", len(original_content))
    print("Original first 300 chars:")
    print(original_content[:300])
    print("\n" + "="*50 + "\n")
    
    # Clean the content
    cleaned_content = clean_latex_content(original_content)
    
    print("Cleaned content length:", len(cleaned_content))
    print("Cleaned content:")
    print(cleaned_content)
    print("\n" + "="*50 + "\n")
    
    # Test regex on cleaned content
    section_pattern = r'\\section\{(?:Question\s*|Q|Problem\s*)(\d+)\}'
    sections = list(re.finditer(section_pattern, cleaned_content, re.IGNORECASE))
    
    print(f"Found {len(sections)} sections in cleaned content")
    for i, match in enumerate(sections):
        print(f"Section {i+1}: Question {match.group(1)} at position {match.start()}-{match.end()}")

if __name__ == "__main__":
    test_latex_cleaning()
