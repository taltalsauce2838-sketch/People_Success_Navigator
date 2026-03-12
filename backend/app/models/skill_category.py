from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base


class SkillCategory(Base):
    __tablename__ = "skill_categories"

    id = Column(Integer, primary_key=True)

    name = Column(String, unique=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    skills = relationship("Skill", back_populates="category")