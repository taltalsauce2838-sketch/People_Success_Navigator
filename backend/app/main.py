from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models.base import Base
from app.db.session import engine

from app.api.v1 import api

import app.models.user
import app.models.department
import app.models.pulse_survey
import app.models.skill
import app.models.skill_category
import app.models.risk_alert
import app.models.ai_consultation
import app.models.intervention_note
import app.models.skill_history
import app.models.survey_analysis

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(api.api_router, prefix="/api/v1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)