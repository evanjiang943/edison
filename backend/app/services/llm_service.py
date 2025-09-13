import json
from openai import OpenAI
from typing import Dict, Any, Optional
from pydantic import BaseModel, ValidationError
from ..core.config import settings


class GradingResult(BaseModel):
    score: int
    feedback: str
    reasoning: Optional[str] = ""
    satisfies_rubric: Optional[bool] = False


class LLMGradingService:
    """Service to grade student answers using OpenAI's GPT models"""
    
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
                temperature=0.1,  # Low temperature for consistent grading
                max_tokens=500,
                timeout=30
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
    grading_service = LLMGradingService()
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
