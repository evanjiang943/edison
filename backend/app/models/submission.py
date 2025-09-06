from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from ..core.database import Base


class SubmissionStatus(enum.Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    GRADED = "graded"
    REVIEWED = "reviewed"
    ERROR = "error"


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # File information
    file_path = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    
    # Parsed content as JSON: {"q1": "student answer", "q2": "student answer", ...}
    parsed_json = Column(JSON)
    
    # Status tracking
    status = Column(Enum(SubmissionStatus), default=SubmissionStatus.UPLOADED)
    
    # Overall grade
    total_score = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("User", back_populates="submissions")
    grades = relationship("Grade", back_populates="submission")
