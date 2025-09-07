import os
import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..core.database import get_db
from ..core.auth import get_current_user
from ..core.config import settings
from ..models.user import User, UserRole
from ..models.assignment import Assignment
from ..models.submission import Submission, SubmissionStatus
from ..services.grading_service import trigger_grading

router = APIRouter()


class SubmissionResponse(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    original_filename: str
    status: SubmissionStatus
    total_score: int
    parsed_json: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/{assignment_id}", response_model=SubmissionResponse)
async def upload_submission(
    assignment_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a LaTeX submission for an assignment"""
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can upload submissions"
        )
    
    # Check if assignment exists
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    # Check if student already has a submission
    existing_submission = db.query(Submission).filter(
        Submission.assignment_id == assignment_id,
        Submission.student_id == current_user.id
    ).first()
    
    if existing_submission:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submission already exists for this assignment"
        )
    
    # Validate file type
    if not file.filename.endswith(('.tex', '.txt')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .tex and .txt files are allowed"
        )
    
    # Create uploads directory if it doesn't exist
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
    
    # Save file
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Create submission record
    submission = Submission(
        assignment_id=assignment_id,
        student_id=current_user.id,
        file_path=file_path,
        original_filename=file.filename,
        status=SubmissionStatus.UPLOADED
    )
    
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    # Trigger async grading
    trigger_grading.delay(submission.id)
    
    return submission


@router.get("/assignment/{assignment_id}", response_model=List[SubmissionResponse])
def list_submissions(
    assignment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List submissions for an assignment"""
    # Check if assignment exists
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found"
        )
    
    if current_user.role == UserRole.STUDENT:
        # Students can only see their own submissions
        submissions = db.query(Submission).filter(
            Submission.assignment_id == assignment_id,
            Submission.student_id == current_user.id
        ).all()
    else:
        # Instructors and TAs can see all submissions
        submissions = db.query(Submission).filter(
            Submission.assignment_id == assignment_id
        ).all()
    
    return submissions


@router.get("/{submission_id}", response_model=SubmissionResponse)
def get_submission(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific submission"""
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    # Check permissions
    if (current_user.role == UserRole.STUDENT and 
        submission.student_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own submissions"
        )
    
    return submission


@router.post("/{submission_id}/regrade")
def trigger_regrade(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Trigger regrading of a submission"""
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    # Only instructors/TAs can trigger regrade
    if current_user.role not in [UserRole.INSTRUCTOR, UserRole.TA]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors and TAs can trigger regrading"
        )
    
    # Update status and trigger grading
    submission.status = SubmissionStatus.PROCESSING
    db.commit()
    
    trigger_grading.delay(submission_id)
    
    return {"message": "Regrading triggered successfully"}
