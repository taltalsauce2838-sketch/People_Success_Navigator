from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base


class SkillHistory(Base):
    __tablename__ = "skill_history"

    id = Column(Integer, primary_key=True)
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    category_id = Column(Integer, ForeignKey("skill_categories.id"), nullable=False)
    
    level = Column(Integer)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="skill_histories")
    category = relationship("SkillCategory")