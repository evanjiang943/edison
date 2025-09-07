#!/usr/bin/env python3
import sys
sys.path.append('.')

from app.services.latex_parser import parse_latex_submission

# Test the parser on the problematic file
file_path = "uploads/ec74db21-1132-4a94-a4fc-ec88db6f0016.tex"

print("Testing LaTeX parser...")
try:
    result = parse_latex_submission(file_path)
    print(f"Parsed {len(result)} questions:")
    for key, value in result.items():
        print(f"\n{key}:")
        print(f"  {value[:200]}...")
except Exception as e:
    print(f"Error: {e}")
