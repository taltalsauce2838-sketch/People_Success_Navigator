from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field


class PulseSurveyCreate(BaseModel):
    score: int = Field(..., ge=1, le=5)
    memo: Optional[str] = None
    survey_date: date = Field(default_factory=date.today)


class PulseSurveyResponse(BaseModel):
    id: int
    score: int
    memo: Optional[str]
    survey_date: date
    created_at: datetime

    class Config:
        from_attributes = True


class PulseSurveyDeleteResponse(BaseModel):
    message: str
    deleted_user_id: int
    deleted_survey_date: date
