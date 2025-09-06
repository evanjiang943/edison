from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..core.database import get_db
from ..core.auth import get_current_user
from ..models.user import User, UserRole
from ..models.assignment import Assignment

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
