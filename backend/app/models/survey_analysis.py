from sqlalchemy import Column, Integer, ForeignKey, Float, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from .base import Base

class SurveyAnalysis(Base):
    __tablename__ = "survey_analysis"

    id = Column(Integer, primary_key=True)

    # どのPulseSurveyに紐づくか
    pulse_survey_id = Column(Integer, ForeignKey("pulse_surveys.id"), nullable=False)

    # AIによるコメント評価（-1.0～1.0 の感情スコアなど）
    sentiment_score = Column(Float, nullable=False)

    # 使用したAIモデル名やバージョン
    model_used = Column(String, nullable=False)

    # レコード作成日時
    created_at = Column(DateTime, default=datetime.utcnow)

    # PulseSurveyとのリレーション
    pulse_survey = relationship("PulseSurvey", back_populates="analyses")