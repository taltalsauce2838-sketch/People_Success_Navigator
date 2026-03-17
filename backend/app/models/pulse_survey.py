from sqlalchemy import Column, Integer, ForeignKey, Text, DateTime, Date, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base


class PulseSurvey(Base):
    __tablename__ = "pulse_surveys"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    score = Column(Integer, CheckConstraint('score >= 1 AND score <= 5'), nullable=False)
    
    memo = Column(Text, nullable=True) # 空白も許容

    # ★追加：1日1回制御用
    survey_date = Column(Date, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    # ★追加：同一ユーザー1日1回制約
    __table_args__ = (
        UniqueConstraint("user_id", "survey_date", name="uq_user_survey_date"),
    )

    user = relationship("User", back_populates="pulse_surveys")
    
    analyses = relationship("SurveyAnalysis", back_populates="pulse_survey", cascade="all, delete-orphan")