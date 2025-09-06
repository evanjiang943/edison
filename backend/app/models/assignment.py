from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    instructor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Store rubric as JSON: {"q1": {"max_points": 10, "criteria": "..."}, ...}
    rubric_json = Column(JSON, nullable=False)
    
    # Store answer key as JSON: {"q1": "answer text", "q2": "answer text", ...}
    answer_key_json = Column(JSON, nullable=False)
    
    # Maximum total points for the assignment
    max_points = Column(Integer, nullable=False, default=100)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    instructor = relationship("User", back_populates="assignments")
    submissions = relationship("Submission", back_populates="assignment")
