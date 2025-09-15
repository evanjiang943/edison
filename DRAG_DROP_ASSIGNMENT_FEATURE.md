# Drag-and-Drop Assignment Creation Feature

## Overview

This feature allows instructors to create assignments by simply drag-and-dropping their existing homework documents, answer keys, and grading rubrics. The system uses advanced LLM parsing to automatically extract questions, subparts, answers, and grading criteria into a structured format with beautiful LaTeX rendering.

## Key Features

### 🎯 **Simple Instructor Experience**
- **Drag & Drop Interface**: Upload assignment files, answer keys, and rubrics with simple drag-and-drop
- **Multiple File Support**: Upload any combination of the three document types
- **File Format Support**: Accepts both LaTeX (.tex) and plain text (.txt) files
- **Automatic Processing**: AI automatically parses and structures the content

### 🤖 **Intelligent LLM Parsing**
- **Question Detection**: Automatically identifies questions (Q1, Question 1, Problem 2, etc.)
- **Subpart Recognition**: Detects subparts (a), b), 1.1, 1.2, etc.)
- **Content Extraction**: Extracts question text, answers, and rubric criteria
- **Point Assignment**: Automatically assigns point values or uses specified ones
- **Multi-Document Merging**: Combines information from assignment, answer key, and rubric files

### 🎨 **Beautiful UI with LaTeX Rendering**
- **Collapsible Questions**: Expandable/collapsible interface for questions and subparts
- **LaTeX Math Rendering**: Full support for mathematical expressions using KaTeX
- **Color-Coded Sections**: 
  - Blue: Questions
  - Green: Answers
  - Yellow: Rubrics
- **Responsive Design**: Works on all screen sizes
- **Live Preview**: See parsed content before creating the assignment

## How It Works

### 1. Upload Files
Navigate to **Assignments → Create from Files** and upload your documents:
- **Assignment Questions**: The main homework document with problems
- **Answer Key**: Solutions and expected answers
- **Grading Rubric**: Point values and grading criteria

### 2. AI Processing
The system uses OpenAI's GPT models to:
- Parse LaTeX and plain text content
- Identify question structure and hierarchy
- Extract relevant content based on document type
- Assign appropriate point values
- Handle mathematical notation and formatting

### 3. Preview & Review
- View the parsed content in a structured format
- See questions, answers, and rubrics organized clearly
- All LaTeX math is rendered beautifully
- Collapsible interface for easy navigation

### 4. Create Assignment
- Add assignment name and description
- System automatically creates the assignment with:
  - Structured rubric for AI grading
  - Complete answer key for comparison
  - Proper point distribution

## Technical Implementation

### Backend Components

#### Enhanced LLM Service (`llm_service.py`)
```python
class LLMService:
    def parse_document(self, content: str, document_type: str) -> DocumentParseResult
    def _build_parsing_prompt(self, content: str, document_type: str) -> str
    def _parse_document_response(self, response: str, document_type: str) -> DocumentParseResult
```

#### New API Endpoints (`assignments.py`)
- `POST /assignments/parse-files`: Parse uploaded files using LLM
- `POST /assignments/create-from-parsed`: Create assignment from parsed data

#### Data Models
```python
class QuestionPart(BaseModel):
    id: str  # e.g., "1a", "2b"
    question_text: str
    answer_text: Optional[str] = ""
    rubric_text: Optional[str] = ""
    max_points: Optional[int] = 10

class ParsedQuestion(BaseModel):
    id: str  # e.g., "1", "2"
    question_text: str
    answer_text: Optional[str] = ""
    rubric_text: Optional[str] = ""
    max_points: Optional[int] = 10
    parts: List[QuestionPart] = []
```

### Frontend Components

#### FileUploadZone Component
- Drag-and-drop functionality
- File validation (type and size)
- Visual feedback for upload status
- Support for multiple file types

#### CollapsibleQuestion Component
- Expandable/collapsible question display
- LaTeX math rendering with KaTeX
- Color-coded sections for different content types
- Nested structure for question parts

#### EnhancedAssignmentForm Page
- Complete workflow for file-based assignment creation
- Real-time preview of parsed content
- Integration with existing assignment system
- Error handling and user feedback

## File Format Support

### LaTeX Files (.tex)
- Automatically cleans LaTeX preamble and document structure
- Preserves mathematical notation and formatting
- Handles common LaTeX commands and environments
- Supports section-based question organization

### Plain Text Files (.txt)
- Simple text parsing for basic assignments
- Automatic question detection using common patterns
- Maintains formatting and structure

## Example Usage

### Sample Files Provided
The repository includes three sample files to test the functionality:

1. **`test_assignment.tex`**: Sample homework with mathematical problems
2. **`test_answer_key.tex`**: Complete solutions with step-by-step explanations
3. **`test_rubric.tex`**: Detailed grading criteria with point breakdowns

### Testing the Feature
1. Start the development server: `./start-dev.sh`
2. Navigate to the assignments page
3. Click "Create from Files"
4. Upload the sample files
5. Click "Parse Files with AI"
6. Review the structured output
7. Create the assignment

## LaTeX Math Rendering

The system supports full LaTeX mathematical notation:

- **Inline Math**: `$x^2 + y^2 = z^2$` → $x^2 + y^2 = z^2$
- **Display Math**: `$$\int_0^1 x^2 dx = \frac{1}{3}$$` → $$\int_0^1 x^2 dx = \frac{1}{3}$$
- **Complex Expressions**: Fractions, square roots, summations, integrals, etc.
- **Error Handling**: Graceful fallback for invalid LaTeX

## Benefits for Instructors

### ⏰ **Time Saving**
- No manual entry of questions and rubrics
- Automatic point calculation and distribution
- Instant structured formatting

### 🎯 **Accuracy**
- AI-powered parsing reduces human error
- Consistent formatting across assignments
- Automatic validation of content structure

### 🔄 **Reusability**
- Easy to update assignments from modified files
- Consistent format for all assignments
- Seamless integration with existing grading system

### 📊 **Enhanced Grading**
- Structured rubrics enable better AI grading
- Clear point distribution for fair assessment
- Detailed criteria for consistent evaluation

## Future Enhancements

- **Batch Processing**: Upload multiple assignments at once
- **Template Support**: Save and reuse parsing templates
- **Custom Prompts**: Allow instructors to customize parsing behavior
- **Version Control**: Track changes to assignments over time
- **Export Options**: Generate formatted PDFs from parsed content

## Getting Started

1. Ensure you have an OpenAI API key configured
2. Install the required dependencies: `npm install katex react-katex`
3. Start the development server
4. Navigate to Assignments → Create from Files
5. Upload your documents and let AI do the work!

This feature transforms the tedious process of manual assignment creation into a simple, efficient, and accurate workflow that saves instructors significant time while ensuring high-quality structured content for AI-powered grading.
