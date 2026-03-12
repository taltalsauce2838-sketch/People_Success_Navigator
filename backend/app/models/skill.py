from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base


class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id"))

    category_id = Column(Integer, ForeignKey("skill_categories.id"))

    level = Column(Integer)

    updated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="skills")

    category = relationship("SkillCategory", back_populates="skills")