from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..core.database import get_db
from ..core.auth import get_current_user
from ..models.user import User, UserRole
from ..models.submission import Submission
from ..models.grade import Grade

router = APIRouter()


class GradeResponse(BaseModel):
    id: int
    submission_id: int
    question_no: str
    ai_score: int
    ai_feedback: str
    final_score: int
    final_feedback: str
    human_reviewed: bool

    class Config:
        orm_mode = True


class GradeUpdate(BaseModel):
    final_score: int
    final_feedback: str


@router.get("/submission/{submission_id}", response_model=List[GradeResponse])
def get_grades_for_submission(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all grades for a specific submission"""
    # Check if submission exists
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
            detail="You can only view grades for your own submissions"
        )
    
    grades = db.query(Grade).filter(Grade.submission_id == submission_id).all()
    return grades


@router.get("/{grade_id}", response_model=GradeResponse)
def get_grade(
    grade_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific grade"""
    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if not grade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grade not found"
        )
    
    # Check permissions through submission
    submission = db.query(Submission).filter(Submission.id == grade.submission_id).first()
    if (current_user.role == UserRole.STUDENT and 
        submission.student_id != current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own grades"
        )
    
    return grade


@router.patch("/{grade_id}", response_model=GradeResponse)
def update_grade(
    grade_id: int,
    grade_update: GradeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a grade (instructors and TAs only)"""
    if current_user.role not in [UserRole.INSTRUCTOR, UserRole.TA]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors and TAs can update grades"
        )
    
    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if not grade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grade not found"
        )
    
    # Update grade
    grade.final_score = grade_update.final_score
    grade.final_feedback = grade_update.final_feedback
    grade.human_reviewed = True
    grade.reviewed_by = current_user.id
    
    db.commit()
    db.refresh(grade)
    
    # Update submission total score
    submission = db.query(Submission).filter(Submission.id == grade.submission_id).first()
    if submission:
        total_score = sum(g.final_score for g in submission.grades)
        submission.total_score = total_score
        db.commit()
    
    return grade


@router.get("/assignment/{assignment_id}/export")
def export_grades(
    assignment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export grades for an assignment as CSV data"""
    if current_user.role not in [UserRole.INSTRUCTOR, UserRole.TA]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only instructors and TAs can export grades"
        )
    
    # Get all submissions for the assignment
    submissions = db.query(Submission).filter(
        Submission.assignment_id == assignment_id
    ).all()
    
    export_data = []
    for submission in submissions:
        student_name = submission.student.name
        student_email = submission.student.email
        total_score = submission.total_score
        
        # Get individual question scores
        grades = db.query(Grade).filter(Grade.submission_id == submission.id).all()
        question_scores = {grade.question_no: grade.final_score for grade in grades}
        
        export_data.append({
            "student_name": student_name,
            "student_email": student_email,
            "total_score": total_score,
            "question_scores": question_scores
        })
    
    return {"data": export_data}
