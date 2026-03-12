from sqlalchemy import Column, Integer, String, Date, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from .base import Base


class UserRole(str, enum.Enum):
    user = "user"
    manager = "manager"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)

    email = Column(String, unique=True, index=True, nullable=False)

    hashed_password = Column(String, nullable=False)

    role = Column(Enum(UserRole), default=UserRole.user)

    department_id = Column(Integer, ForeignKey("departments.id"))

    manager_id = Column(Integer, ForeignKey("users.id"))

    joined_at = Column(Date)

    created_at = Column(DateTime, default=datetime.utcnow)

    department = relationship("Department", back_populates="users")

    manager = relationship(
        "User",
        remote_side=[id],
        backref="subordinates"
    )

    pulse_surveys = relationship("PulseSurvey", back_populates="user")

    skills = relationship("Skill", back_populates="user")
    
    skill_histories = relationship("SkillHistory")

    risk_alerts = relationship("RiskAlert", back_populates="user")

    ai_consultations = relationship("AIConsultation", back_populates="user")