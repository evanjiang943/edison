import json
from openai import OpenAI
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, ValidationError
from ..core.config import settings


class GradingResult(BaseModel):
    score: int
    feedback: str
    reasoning: Optional[str] = ""
    satisfies_rubric: Optional[bool] = False


class QuestionPart(BaseModel):
    id: str  # e.g., "1a", "2b", etc.
    question_text: str
    answer_text: Optional[str] = ""
    rubric_text: Optional[str] = ""
    max_points: Optional[int] = 10


class ParsedQuestion(BaseModel):
    id: str  # e.g., "1", "2", etc.
    question_text: str
    answer_text: Optional[str] = ""
    rubric_text: Optional[str] = ""
    max_points: Optional[int] = 10
    parts: List[QuestionPart] = []


class DocumentParseResult(BaseModel):
    questions: List[ParsedQuestion]
    document_type: str  # "assignment", "answer_key", or "rubric"
    
    class Config:
        from_attributes = True


class LLMService:
    """Service for LLM operations including grading and document parsing"""
    
    def __init__(self):
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY must be set in environment variables")
        
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4o-mini"  # Using the cost-effective model
        self.max_retries = 3
    
    def grade_question(
        self,
        question: str,
        student_answer: str,
        answer_key: str,
        rubric: Dict[str, Any],
        max_points: int = 10
    ) -> GradingResult:
        """
        Grade a single question using the LLM
        
        Args:
            question: The question text
            student_answer: Student's answer
            answer_key: Expected answer/solution
            rubric: Grading rubric with criteria
            max_points: Maximum points for this question
            
        Returns:
            GradingResult with score and feedback
        """
        
        # Check if API key is properly configured
        if settings.OPENAI_API_KEY == "your_openai_api_key_here":
            return GradingResult(
                score=0,
                feedback="OpenAI API key not configured. Please set OPENAI_API_KEY in environment variables.",
                reasoning="Cannot grade without valid API key",
                satisfies_rubric=False
            )
        
        # Construct the grading prompt
        prompt = self._build_grading_prompt(
            question, student_answer, answer_key, rubric, max_points
        )
        
        # Try grading with retries for malformed JSON
        for attempt in range(self.max_retries):
            try:
                response = self._call_openai(prompt)
                result = self._parse_response(response, max_points)
                return result
            
            except (json.JSONDecodeError, ValidationError) as e:
                if attempt == self.max_retries - 1:
                    # Last attempt failed, return default response
                    return GradingResult(
                        score=0,
                        feedback=f"Error in AI grading: {str(e)}. Please review manually.",
                        reasoning="AI grading failed due to response parsing error.",
                        satisfies_rubric=False
                    )
                continue
            
            except Exception as e:
                return GradingResult(
                    score=0,
                    feedback=f"Error in AI grading: {str(e)}. Please review manually.",
                    reasoning=f"Unexpected error: {str(e)}",
                    satisfies_rubric=False
                )
    
    def _build_grading_prompt(
        self,
        question: str,
        student_answer: str,
        answer_key: str,
        rubric: Dict[str, Any],
        max_points: int
    ) -> str:
        """Build the grading prompt for the LLM"""
        
        rubric_text = self._format_rubric(rubric)
        
        prompt = f"""
You are an expert teaching assistant grading student homework. Grade the following student answer strictly according to the provided rubric and answer key.

QUESTION:
{question}

ANSWER KEY:
{answer_key}

STUDENT ANSWER:
{student_answer}

GRADING RUBRIC:
{rubric_text}

MAXIMUM POINTS: {max_points}

INSTRUCTIONS:
1. Compare the student answer to the answer key
2. Apply the grading criteria from the rubric
3. Provide a score from 0 to {max_points}
4. FEEDBACK POLICY: 
   - If the answer earns FULL POINTS ({max_points}/{max_points}) and fully satisfies the rubric, provide NO feedback (empty string)
   - If the answer is partially correct or incorrect, provide constructive feedback explaining what was missing or wrong
5. Be consistent and fair in your grading
6. Focus feedback on specific improvements needed to meet the rubric requirements

IMPORTANT: Respond with ONLY a valid JSON object in this exact format:
{{
    "score": <integer from 0 to {max_points}>,
    "feedback": "<detailed feedback if score < {max_points}, empty string if score = {max_points}>",
    "reasoning": "<brief explanation of how you arrived at this score>",
    "satisfies_rubric": <true if score = {max_points}, false otherwise>
}}

Do not include any text before or after the JSON object.
"""
        return prompt
    
    def _format_rubric(self, rubric: Dict[str, Any]) -> str:
        """Format rubric dictionary into readable text"""
        if not rubric:
            return "No specific rubric provided. Grade based on correctness and completeness."
        
        rubric_lines = []
        for criterion, details in rubric.items():
            if isinstance(details, dict):
                points = details.get('points', 'N/A')
                description = details.get('description', details.get('criteria', ''))
                rubric_lines.append(f"- {criterion} ({points} points): {description}")
            else:
                rubric_lines.append(f"- {criterion}: {details}")
        
        return "\n".join(rubric_lines)
    
    def _call_openai(self, prompt: str) -> str:
        """Make API call to OpenAI"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful teaching assistant that grades student work fairly and consistently. Always respond with valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,  # Low temperature for consistent parsing
                max_tokens=4000,  # Increased for document parsing
                timeout=60
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            if "rate_limit" in str(e).lower():
                raise Exception("OpenAI API rate limit exceeded. Please try again later.")
            elif "invalid" in str(e).lower():
                raise Exception(f"Invalid OpenAI request: {str(e)}")
            else:
                raise Exception(f"OpenAI API error: {str(e)}")
    
    def _parse_response(self, response: str, max_points: int) -> GradingResult:
        """Parse and validate the LLM response"""
        
        # Clean up response (remove markdown code blocks if present)
        response = response.strip()
        if response.startswith('```json'):
            response = response[7:]
        if response.endswith('```'):
            response = response[:-3]
        response = response.strip()
        
        # Parse JSON
        try:
            data = json.loads(response)
        except json.JSONDecodeError:
            raise json.JSONDecodeError("Invalid JSON in LLM response", response, 0)
        
        # Validate and create result
        result = GradingResult(**data)
        
        # Ensure score is within bounds
        result.score = max(0, min(result.score, max_points))
        
        return result
    
    def parse_document(self, content: str, document_type: str) -> DocumentParseResult:
        """
        Parse a document (assignment, answer key, or rubric) and extract structured questions
        
        Args:
            content: The document content (LaTeX or plain text)
            document_type: One of "assignment", "answer_key", or "rubric"
            
        Returns:
            DocumentParseResult with structured questions and parts
        """
        
        # Check if API key is properly configured
        if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "your_openai_api_key_here" or settings.OPENAI_API_KEY == "":
            # Fallback to regex parsing when no API key is configured
            return self._create_mock_parse_result(content, document_type)
        
        # Build parsing prompt based on document type
        prompt = self._build_parsing_prompt(content, document_type)
        
        # Try parsing with retries
        for attempt in range(self.max_retries):
            try:
                response = self._call_openai(prompt)
                result = self._parse_document_response(response, document_type)
                return result
            
            except (json.JSONDecodeError, ValidationError) as e:
                if attempt == self.max_retries - 1:
                    # Last attempt failed, return empty result
                    return DocumentParseResult(
                        questions=[],
                        document_type=document_type
                    )
                continue
            
            except Exception as e:
                return DocumentParseResult(
                    questions=[],
                    document_type=document_type
                )
    
    def _build_parsing_prompt(self, content: str, document_type: str) -> str:
        """Build the parsing prompt for the LLM based on document type"""
        
        if document_type == "assignment":
            instruction = """You are parsing a homework assignment document. Your task is to extract each question and its parts with their question text. Focus on identifying the problems students need to solve."""
            content_focus = "question_text"
        elif document_type == "answer_key":
            instruction = """You are parsing an answer key document. Your task is to extract each question/part with its corresponding answer, solution, or explanation. Focus on the provided solutions."""
            content_focus = "answer_text"
        elif document_type == "rubric":
            instruction = """You are parsing a grading rubric document. Your task is to extract each question/part with its grading criteria, point values, and evaluation guidelines."""
            content_focus = "rubric_text"
        else:
            instruction = """You are parsing an academic document. Extract each question and its parts."""
            content_focus = "question_text"
        
        prompt = f"""
{instruction}

DOCUMENT CONTENT:
{content}

PARSING INSTRUCTIONS:
1. Carefully read through the entire document
2. Identify all questions using patterns like:
   - \\section{{Question 1}}, \\section{{Q1}}, \\section{{Problem 1}}
   - "Question 1:", "Problem 2:", "Q3."
   - Numbered items like "1.", "2.", etc.
3. For each question, identify subparts using patterns like:
   - \\item[(a)], \\item[(b)] in LaTeX
   - "(a)", "(b)", "a)", "b)" in plain text
   - "1.1", "1.2", "2.1", "2.2" style numbering
4. Extract the complete text content for each question and part
5. For point values:
   - Look for explicit point values like "(10 points)", "10 pts", etc.
   - If not specified, use reasonable defaults (10 points for questions, 5 for parts)
6. Clean up LaTeX formatting but preserve mathematical expressions
7. Handle nested structures properly (questions with multiple parts)

CONTENT FOCUS: Pay special attention to extracting the {content_focus} for this document type.

OUTPUT FORMAT: Respond with ONLY a valid JSON object in this exact format:
{{
    "questions": [
        {{
            "id": "1",
            "question_text": "Complete question text (empty string if not applicable for this document type)",
            "answer_text": "Complete answer/solution text (empty string if not applicable for this document type)",
            "rubric_text": "Complete grading criteria text (empty string if not applicable for this document type)", 
            "max_points": 20,
            "parts": [
                {{
                    "id": "1a",
                    "question_text": "Complete subpart question text",
                    "answer_text": "Complete subpart answer text",
                    "rubric_text": "Complete subpart grading criteria",
                    "max_points": 10
                }},
                {{
                    "id": "1b", 
                    "question_text": "Complete subpart question text",
                    "answer_text": "Complete subpart answer text",
                    "rubric_text": "Complete subpart grading criteria",
                    "max_points": 10
                }}
            ]
        }},
        {{
            "id": "2",
            "question_text": "Second question text",
            "answer_text": "Second question answer",
            "rubric_text": "Second question grading criteria",
            "max_points": 15,
            "parts": []
        }}
    ]
}}

CRITICAL: 
- Do not include any text before or after the JSON object
- Ensure all strings are properly escaped for JSON
- Include empty strings for fields not applicable to this document type
- Preserve mathematical notation and formatting within the text fields
- Be thorough in extracting all content - don't truncate or summarize
"""
        return prompt
    
    def _parse_document_response(self, response: str, document_type: str) -> DocumentParseResult:
        """Parse and validate the LLM document parsing response"""
        
        # Clean up response (remove markdown code blocks if present)
        response = response.strip()
        if response.startswith('```json'):
            response = response[7:]
        if response.endswith('```'):
            response = response[:-3]
        response = response.strip()
        
        # Parse JSON
        try:
            data = json.loads(response)
        except json.JSONDecodeError:
            raise json.JSONDecodeError("Invalid JSON in LLM response", response, 0)
        
        # Validate and create result
        questions = []
        for q_data in data.get("questions", []):
            parts = []
            for p_data in q_data.get("parts", []):
                part = QuestionPart(**p_data)
                parts.append(part)
            
            question = ParsedQuestion(
                id=q_data["id"],
                question_text=q_data.get("question_text", ""),
                answer_text=q_data.get("answer_text", ""),
                rubric_text=q_data.get("rubric_text", ""),
                max_points=q_data.get("max_points", 10),
                parts=parts
            )
            questions.append(question)
        
        return DocumentParseResult(
            questions=questions,
            document_type=document_type
        )
    
    def _create_mock_parse_result(self, content: str, document_type: str) -> DocumentParseResult:
        """Create mock parsing result when OpenAI API is not available"""
        
        import re
        
        questions = []
        
        # Look for section patterns like \section{Question 1} or \section{Q1} or \section{Question 1 (30 points)}
        section_pattern = r'\\section\{(?:Question\s*|Q|Problem\s*)(\d+)(?:\s*\([^)]*\))?\}'
        sections = list(re.finditer(section_pattern, content, re.IGNORECASE))
        
        if not sections:
            # Fallback: look for numbered questions
            question_patterns = [
                r'\n\s*(\d+)\.?\s+',  # "1. " or "1 "
                r'\n\s*Question\s+(\d+)',  # "Question 1"
                r'\n\s*Problem\s+(\d+)',  # "Problem 1"
            ]
            
            for pattern in question_patterns:
                matches = list(re.finditer(pattern, content, re.IGNORECASE))
                if matches:
                    sections = matches
                    break
        
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
            
            # Look for enumerated parts like (a), (b) or \item[(a)]
            parts = []
            part_pattern = r'\\item\[\(?([a-z])\)?\]|\\item\[([a-z])\]|^\s*\(?([a-z])\)\s*'
            part_matches = list(re.finditer(part_pattern, question_content, re.MULTILINE | re.IGNORECASE))
            
            if part_matches:
                for j, part_match in enumerate(part_matches):
                    # Extract part ID from any of the groups
                    part_id = part_match.group(1) or part_match.group(2) or part_match.group(3)
                    if not part_id:
                        continue
                        
                    part_start = part_match.end()
                    
                    if j + 1 < len(part_matches):
                        part_end = part_matches[j + 1].start()
                    else:
                        part_end = len(question_content)
                    
                    part_content = question_content[part_start:part_end].strip()
                    
                    # Clean up LaTeX formatting but keep math
                    part_content = re.sub(r'\\end\{enumerate\}.*', '', part_content, flags=re.DOTALL)
                    part_content = part_content.strip()
                    
                    # Extract point values for rubric
                    part_points = 5
                    if document_type == "rubric":
                        point_match = re.search(r'(\d+)\s*points?', part_content, re.IGNORECASE)
                        if point_match:
                            part_points = int(point_match.group(1))
                    
                    # Determine content based on document type
                    if document_type == "assignment":
                        part_question_text = part_content
                        part_answer_text = ""
                        part_rubric_text = ""
                    elif document_type == "answer_key":
                        part_question_text = ""
                        part_answer_text = part_content
                        part_rubric_text = ""
                    else:  # rubric
                        part_question_text = ""
                        part_answer_text = ""
                        part_rubric_text = part_content
                    
                    parts.append(QuestionPart(
                        id=f"{question_num}{part_id}",
                        question_text=part_question_text,
                        answer_text=part_answer_text,
                        rubric_text=part_rubric_text,
                        max_points=part_points
                    ))
            
            # Determine main question content based on document type
            main_content = question_content
            if parts and part_matches:
                # Split at first part to get main content
                try:
                    main_content = question_content.split(part_matches[0].group(0))[0].strip()
                except:
                    main_content = question_content
            
            # Clean up main content
            main_content = re.sub(r'\\begin\{enumerate\}.*', '', main_content, flags=re.DOTALL)
            main_content = main_content.strip()
            
            # Extract point values from rubric text
            max_points = 20 if parts else 10
            if document_type == "rubric":
                point_match = re.search(r'(\d+)\s*points?', main_content or question_content, re.IGNORECASE)
                if point_match:
                    max_points = int(point_match.group(1))
                elif parts:
                    # Sum up part points
                    max_points = sum(part.max_points for part in parts)
            
            if document_type == "assignment":
                main_question_text = main_content
                main_answer_text = ""
                main_rubric_text = ""
            elif document_type == "answer_key":
                main_question_text = ""
                main_answer_text = main_content
                main_rubric_text = ""
            else:  # rubric
                main_question_text = ""
                main_answer_text = ""
                main_rubric_text = main_content
            
            questions.append(ParsedQuestion(
                id=question_num,
                question_text=main_question_text,
                answer_text=main_answer_text,
                rubric_text=main_rubric_text,
                max_points=max_points,
                parts=parts
            ))
        
        return DocumentParseResult(
            questions=questions,
            document_type=document_type
        )


# Legacy class alias for backward compatibility
class LLMGradingService(LLMService):
    pass


def _find_matching_key(question_id: str, available_keys: list) -> str:
    """
    Find the best matching key for a question ID
    
    Args:
        question_id: The question ID to match (e.g., "q1.1.b")
        available_keys: List of available keys in answer_key/rubric
        
    Returns:
        Best matching key or None if no match found
    """
    # Exact match first
    if question_id in available_keys:
        return question_id
    
    # Try to find parent question (e.g., "q1.1.b" -> "q1")
    parts = question_id.split('.')
    for i in range(len(parts) - 1, 0, -1):
        parent_key = '.'.join(parts[:i])
        if parent_key in available_keys:
            return parent_key
    
    # Try to find by number only (e.g., "q1.1.b" -> "q1")
    import re
    match = re.match(r'q(\d+)', question_id)
    if match:
        simple_key = f"q{match.group(1)}"
        if simple_key in available_keys:
            return simple_key
    
    # If we have only one key and it looks like a parent, use it
    if len(available_keys) == 1:
        return available_keys[0]
    
    return None


def grade_submission_questions(
    questions_answers: Dict[str, str],
    answer_key: Dict[str, str],
    rubric: Dict[str, Dict[str, Any]]
) -> Dict[str, GradingResult]:
    """
    Grade all questions in a submission with flexible question ID matching
    
    Args:
        questions_answers: Dict of question_id -> student_answer
        answer_key: Dict of question_id -> correct_answer
        rubric: Dict of question_id -> rubric_criteria
        
    Returns:
        Dict of question_id -> GradingResult
    """
    grading_service = LLMService()
    results = {}
    
    answer_keys = list(answer_key.keys())
    rubric_keys = list(rubric.keys())
    
    for question_id, student_answer in questions_answers.items():
        # Find matching answer key
        answer_key_match = _find_matching_key(question_id, answer_keys)
        rubric_key_match = _find_matching_key(question_id, rubric_keys)
        
        if answer_key_match and rubric_key_match:
            question_rubric = rubric.get(rubric_key_match, {})
            max_points = question_rubric.get('max_points', 10)
            
            result = grading_service.grade_question(
                question=f"Question {question_id}",
                student_answer=student_answer,
                answer_key=answer_key[answer_key_match],
                rubric=question_rubric,
                max_points=max_points
            )
            
            results[question_id] = result
        else:
            # Create a default grade if no match found
            results[question_id] = GradingResult(
                score=0,
                feedback=f"No matching answer key or rubric found for question {question_id}. Please review manually.",
                reasoning="Question ID mismatch - unable to grade automatically",
                satisfies_rubric=False
            )
    
    return results


def parse_assignment_documents(
    assignment_content: str = "",
    answer_key_content: str = "",
    rubric_content: str = ""
) -> Dict[str, DocumentParseResult]:
    """
    Parse multiple assignment-related documents
    
    Args:
        assignment_content: The assignment document content
        answer_key_content: The answer key document content  
        rubric_content: The grading rubric document content
        
    Returns:
        Dict with keys "assignment", "answer_key", "rubric" and DocumentParseResult values
    """
    llm_service = LLMService()
    results = {}
    
    if assignment_content.strip():
        results["assignment"] = llm_service.parse_document(assignment_content, "assignment")
    
    if answer_key_content.strip():
        results["answer_key"] = llm_service.parse_document(answer_key_content, "answer_key")
    
    if rubric_content.strip():
        results["rubric"] = llm_service.parse_document(rubric_content, "rubric")
    
    return results
