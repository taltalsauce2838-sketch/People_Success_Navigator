from sqlalchemy import Column, Integer, ForeignKey, String, Float, Boolean, Text, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from .base import Base


# ★追加：Enum化
class RiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class RiskAlert(Base):
    __tablename__ = "risk_alerts"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # ★変更：Enum
    status = Column(Enum(RiskLevel), nullable=False)

    reason = Column(Text)

    ai_model = Column(String)

    confidence = Column(Float)

    is_resolved = Column(Boolean, default=False)

    # ★追加：どのサーベイから生成されたか
    pulse_survey_id = Column(
        Integer,
        ForeignKey("pulse_surveys.id")
    )

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="risk_alerts")

    # ★追加：surveyとの関係
    pulse_survey = relationship("PulseSurvey", back_populates="risk_alerts")