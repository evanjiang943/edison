import re
from typing import Dict, List
from pylatexenc.latex2text import LatexNodes2Text


class LatexParser:
    """Service to parse LaTeX files and extract question-answer pairs"""
    
    def __init__(self):
        self.latex_converter = LatexNodes2Text()
    
    def parse_latex_file(self, file_path: str) -> Dict[str, str]:
        """
        Parse a LaTeX file and extract questions/answers
        
        Expected format:
        \\section{Q1} or \\section{Question 1} or similar patterns
        Answer content...
        
        \\section{Q2} or \\section{Question 2}
        Answer content...
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            return self._extract_questions(content)
        except Exception as e:
            raise Exception(f"Error parsing LaTeX file: {str(e)}")
    
    def _extract_questions(self, latex_content: str) -> Dict[str, str]:
        """Extract questions from LaTeX content using section patterns"""
        
        # Clean up the content first
        content = self._clean_latex_content(latex_content)
        
        # Pattern to match section headers for questions
        # Matches: \section{Q1}, \section{Question 1}, \section{Problem 1}, etc.
        section_pattern = r'\\section\{(?:Q|Question|Problem)\s*(\d+)[^}]*\}'
        
        # Find all section matches
        sections = list(re.finditer(section_pattern, content, re.IGNORECASE))
        
        if not sections:
            # Fallback: try to split by common question patterns
            return self._fallback_question_extraction(content)
        
        questions = {}
        
        for i, match in enumerate(sections):
            question_num = match.group(1)
            start_pos = match.end()
            
            # Find the end position (start of next section or end of document)
            if i + 1 < len(sections):
                end_pos = sections[i + 1].start()
            else:
                end_pos = len(content)
            
            # Extract the answer content
            answer_latex = content[start_pos:end_pos].strip()
            
            # Convert LaTeX to plain text
            try:
                answer_text = self.latex_converter.latex_to_text(answer_latex)
                answer_text = self._clean_text(answer_text)
            except:
                # If conversion fails, use the raw LaTeX
                answer_text = answer_latex
            
            questions[f"q{question_num}"] = answer_text
        
        return questions
    
    def _fallback_question_extraction(self, content: str) -> Dict[str, str]:
        """Fallback method when section headers are not found"""
        
        # Try to find question patterns like "1.", "Q1:", "Question 1:", etc.
        question_patterns = [
            r'\n\s*(\d+)\.\s*',  # "1. "
            r'\n\s*Q(\d+):?\s*',  # "Q1:" or "Q1 "
            r'\n\s*Question\s+(\d+):?\s*',  # "Question 1:"
            r'\n\s*Problem\s+(\d+):?\s*',  # "Problem 1:"
        ]
        
        for pattern in question_patterns:
            matches = list(re.finditer(pattern, content, re.IGNORECASE))
            if matches:
                questions = {}
                
                for i, match in enumerate(matches):
                    question_num = match.group(1)
                    start_pos = match.end()
                    
                    # Find the end position
                    if i + 1 < len(matches):
                        end_pos = matches[i + 1].start()
                    else:
                        end_pos = len(content)
                    
                    # Extract answer content
                    answer_latex = content[start_pos:end_pos].strip()
                    
                    try:
                        answer_text = self.latex_converter.latex_to_text(answer_latex)
                        answer_text = self._clean_text(answer_text)
                    except:
                        answer_text = answer_latex
                    
                    questions[f"q{question_num}"] = answer_text
                
                return questions
        
        # If no patterns found, return the entire content as one answer
        try:
            clean_content = self.latex_converter.latex_to_text(content)
            clean_content = self._clean_text(clean_content)
        except:
            clean_content = content
            
        return {"q1": clean_content}
    
    def _clean_latex_content(self, content: str) -> str:
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
    
    def _clean_text(self, text: str) -> str:
        """Clean converted text"""
        # Remove excessive whitespace
        text = re.sub(r'\n\s*\n', '\n\n', text)  # Multiple newlines to double
        text = re.sub(r' +', ' ', text)  # Multiple spaces to single
        
        return text.strip()


def parse_latex_submission(file_path: str) -> Dict[str, str]:
    """
    Convenience function to parse a LaTeX submission file
    
    Args:
        file_path: Path to the LaTeX file
        
    Returns:
        Dictionary with question numbers as keys and answers as values
        e.g., {"q1": "answer text", "q2": "answer text"}
    """
    parser = LatexParser()
    return parser.parse_latex_file(file_path)
