from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from ..core.database import Base


class UserRole(enum.Enum):
    STUDENT = "student"
    INSTRUCTOR = "instructor"
    TA = "ta"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    assignments = relationship("Assignment", back_populates="instructor")
    submissions = relationship("Submission", back_populates="student")
