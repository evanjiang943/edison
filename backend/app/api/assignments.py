import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..core.database import get_db
from ..core.auth import get_current_user
from ..core.config import settings
from ..models.user import User, UserRole
from ..models.assignment import Assignment
from ..services.llm_service import parse_assignment_documents, DocumentParseResult
from ..services.latex_parser import LatexParser

router = APIRouter()


class AssignmentCreate(BaseModel):
    name: str
    description: str = ""
    rubric_json: dict
    answer_key_json: dict
    max_points: int = 100


class AssignmentResponse(BaseModel):
    id: int
    name: str
    description: str
    rubric_json: dict
    answer_key_json: dict
    max_points: int
    instructor_id: int

    class Config:
        orm_mode = True


class ParsedAssignmentResponse(BaseModel):
    assignment: Optional[DocumentParseResult] = None
    answer_key: Optional[DocumentParseResult] = None
    rubric: Optional[DocumentParseResult] = None


@router.post("/", response_model=AssignmentResponse)
def create_assignment(
    assignment_data: AssignmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new assignment (instructors only)"""
    if current_user.role not in [UserRole.INSTRUCTOR, UserRole.TA]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors and TAs can create assignments"
        )
    
    assignment = Assignment(
        name=assignment_data.name,
        description=assignment_data.description,
        instructor_id=current_user.id,
        rubric_json=assignment_data.rubric_json,
        answer_key_json=assignment_data.answer_key_json,
        max_points=assignment_data.max_points
    )
    
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    
    return assignment


@router.get("/", response_model=List[AssignmentResponse])
def list_assignments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all assignments"""
    if current_user.role == UserRole.INSTRUCTOR:
        # Instructors see their own assignments
        assignments = db.query(Assignment).filter(Assignment.instructor_id == current_user.id).all()
    elif current_user.role == UserRole.TA:
        # TAs see all assignments (for now - could be filtered by course later)
        assignments = db.query(Assignment).all()
    else:
        # Students see all assignments
        assignments = db.query(Assignment).all()
    
    return assignments


@router.get("/{assignment_id}", response_model=AssignmentResponse)
def get_assignment(
    assignment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific assignment"""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # For students, don't show answer key
    if current_user.role == UserRole.STUDENT:
        assignment.answer_key_json = {}
    
    return assignment


@router.put("/{assignment_id}", response_model=AssignmentResponse)
def update_assignment(
    assignment_id: int,
    assignment_data: AssignmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an assignment (instructors only)"""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    if current_user.role not in [UserRole.INSTRUCTOR, UserRole.TA] or assignment.instructor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assignment instructor can update it"
        )
    
    # Update assignment fields
    assignment.name = assignment_data.name
    assignment.description = assignment_data.description
    assignment.rubric_json = assignment_data.rubric_json
    assignment.answer_key_json = assignment_data.answer_key_json
    assignment.max_points = assignment_data.max_points
    
    db.commit()
    db.refresh(assignment)
    
    return assignment


@router.post("/parse-files", response_model=ParsedAssignmentResponse)
async def parse_assignment_files(
    assignment_file: Optional[UploadFile] = File(None),
    answer_key_file: Optional[UploadFile] = File(None),
    rubric_file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
):
    """Parse uploaded assignment files using LLM to extract structured questions"""
    if current_user.role not in [UserRole.INSTRUCTOR, UserRole.TA]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors and TAs can parse assignment files"
        )
    
    # Helper function to read file content
    async def read_file_content(file: Optional[UploadFile]) -> str:
        if not file:
            return ""
        
        # Validate file type
        if not file.filename.endswith(('.tex', '.txt')):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {file.filename} must be a .tex or .txt file"
            )
        
        content = await file.read()
        try:
            return content.decode('utf-8')
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File {file.filename} contains invalid UTF-8 encoding"
            )
    
    # Read file contents
    assignment_content = await read_file_content(assignment_file)
    answer_key_content = await read_file_content(answer_key_file)
    rubric_content = await read_file_content(rubric_file)
    
    # If LaTeX files, try to clean them first
    latex_parser = LatexParser()
    
    if assignment_content and assignment_file and assignment_file.filename.endswith('.tex'):
        try:
            assignment_content = latex_parser._clean_latex_content(assignment_content)
        except:
            pass  # Use original content if cleaning fails
    
    if answer_key_content and answer_key_file and answer_key_file.filename.endswith('.tex'):
        try:
            answer_key_content = latex_parser._clean_latex_content(answer_key_content)
        except:
            pass
    
    if rubric_content and rubric_file and rubric_file.filename.endswith('.tex'):
        try:
            rubric_content = latex_parser._clean_latex_content(rubric_content)
        except:
            pass
    
    # Parse documents using LLM
    try:
        parsed_results = parse_assignment_documents(
            assignment_content=assignment_content,
            answer_key_content=answer_key_content,
            rubric_content=rubric_content
        )
        
        
        return ParsedAssignmentResponse(
            assignment=parsed_results.get("assignment"),
            answer_key=parsed_results.get("answer_key"),
            rubric=parsed_results.get("rubric")
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error parsing files: {str(e)}"
        )


@router.post("/create-from-parsed", response_model=AssignmentResponse)
def create_assignment_from_parsed(
    name: str = Form(...),
    description: str = Form(""),
    parsed_data: str = Form(...),  # JSON string of parsed assignment data
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create an assignment from parsed document data"""
    if current_user.role not in [UserRole.INSTRUCTOR, UserRole.TA]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors and TAs can create assignments"
        )
    
    try:
        import json
        parsed_json = json.loads(parsed_data)
        
        # Extract rubric and answer key from parsed data
        rubric_json = {}
        answer_key_json = {}
        total_points = 0
        
        # Process assignment questions to build rubric and answer key
        if "assignment" in parsed_json and parsed_json["assignment"]:
            assignment_questions = parsed_json["assignment"].get("questions", [])
        elif "answer_key" in parsed_json and parsed_json["answer_key"]:
            assignment_questions = parsed_json["answer_key"].get("questions", [])
        elif "rubric" in parsed_json and parsed_json["rubric"]:
            assignment_questions = parsed_json["rubric"].get("questions", [])
        else:
            assignment_questions = []
        
        for question in assignment_questions:
            q_id = question["id"]
            max_points = question.get("max_points", 10)
            total_points += max_points
            
            # Build rubric entry
            rubric_json[f"q{q_id}"] = {
                "question_text": question.get("question_text", ""),
                "max_points": max_points,
                "criteria": question.get("rubric_text", "Grade based on correctness and completeness")
            }
            
            # Build answer key entry
            answer_key_json[f"q{q_id}"] = question.get("answer_text", "")
            
            # Handle subparts
            for part in question.get("parts", []):
                part_id = part["id"]
                part_points = part.get("max_points", 5)
                total_points += part_points
                
                rubric_json[f"q{part_id}"] = {
                    "question_text": part.get("question_text", ""),
                    "max_points": part_points,
                    "criteria": part.get("rubric_text", "Grade based on correctness and completeness")
                }
                
                answer_key_json[f"q{part_id}"] = part.get("answer_text", "")
        
        # Merge data from rubric document if available
        if "rubric" in parsed_json and parsed_json["rubric"]:
            for question in parsed_json["rubric"].get("questions", []):
                q_id = f"q{question['id']}"
                if q_id in rubric_json:
                    # Update question text if available
                    if question.get("question_text"):
                        rubric_json[q_id]["question_text"] = question["question_text"]
                    rubric_json[q_id]["criteria"] = question.get("rubric_text", rubric_json[q_id]["criteria"])
                    if question.get("max_points"):
                        rubric_json[q_id]["max_points"] = question["max_points"]
                
                for part in question.get("parts", []):
                    part_id = f"q{part['id']}"
                    if part_id in rubric_json:
                        # Update question text if available
                        if part.get("question_text"):
                            rubric_json[part_id]["question_text"] = part["question_text"]
                        rubric_json[part_id]["criteria"] = part.get("rubric_text", rubric_json[part_id]["criteria"])
                        if part.get("max_points"):
                            rubric_json[part_id]["max_points"] = part["max_points"]
        
        # Merge data from answer key document if available
        if "answer_key" in parsed_json and parsed_json["answer_key"]:
            for question in parsed_json["answer_key"].get("questions", []):
                q_id = f"q{question['id']}"
                if q_id in answer_key_json:
                    answer_key_json[q_id] = question.get("answer_text", answer_key_json[q_id])
                
                for part in question.get("parts", []):
                    part_id = f"q{part['id']}"
                    if part_id in answer_key_json:
                        answer_key_json[part_id] = part.get("answer_text", answer_key_json[part_id])
        
        # Create assignment
        assignment = Assignment(
            name=name,
            description=description,
            instructor_id=current_user.id,
            rubric_json=rubric_json,
            answer_key_json=answer_key_json,
            max_points=total_points
        )
        
        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        
        return assignment
        
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON in parsed data"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating assignment: {str(e)}"
        )
