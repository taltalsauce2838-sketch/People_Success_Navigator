from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from .base import Base


class RiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class RiskExecutionType(str, enum.Enum):
    manual = "manual"
    batch = "batch"


class RiskAlert(Base):
    __tablename__ = "risk_alerts"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "evaluation_start_date",
            "evaluation_end_date",
            name="uq_risk_alert_user_eval_period",
        ),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(RiskLevel), nullable=False)
    reason = Column(Text)
    confidence = Column(Float)
    is_resolved = Column(Boolean, default=False, nullable=False)
    evaluation_start_date = Column(Date, nullable=False)
    evaluation_end_date = Column(Date, nullable=False)
    judged_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    execution_type = Column(Enum(RiskExecutionType), nullable=False, default=RiskExecutionType.manual)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="risk_alerts")
