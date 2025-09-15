from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class Grade(Base):
    __tablename__ = "grades"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=False)
    question_no = Column(String, nullable=False)  # e.g., "q1", "q2", etc.
    
    # AI-generated scores and feedback
    ai_score = Column(Integer, nullable=False)
    ai_feedback = Column(Text)
    ai_satisfies_rubric = Column(Boolean, default=False)
    
    # Final scores and feedback (after human review)
    final_score = Column(Integer, nullable=False)
    final_feedback = Column(Text)
    
    # Track if human has reviewed/overridden
    human_reviewed = Column(Boolean, default=False)
    
    # Who reviewed (TA/instructor)
    reviewed_by = Column(Integer, ForeignKey("users.id"))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    submission = relationship("Submission", back_populates="grades")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
