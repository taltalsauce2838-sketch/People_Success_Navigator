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

    confidence = Column(Float)

    is_resolved = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="risk_alerts")
