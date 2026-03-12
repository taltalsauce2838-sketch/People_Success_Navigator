from sqlalchemy import Column, Integer, ForeignKey, Text, Float, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base


class AIConsultation(Base):
    __tablename__ = "ai_consultations"

    id = Column(Integer, primary_key=True)

    user_id = Column(Integer, ForeignKey("users.id"))

    query_text = Column(Text)

    sentiment_score = Column(Float)

    response_text = Column(Text)

    ai_model = Column(String)

    token_usage = Column(Integer)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="ai_consultations")