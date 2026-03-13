from datetime import date

from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, Query, status
from sqlalchemy.orm import Session

from ....db.session import get_db
from ....schemas.pulse_survey import (
    PulseSurveyCreate,
    PulseSurveyResponse,
    PulseSurveyDeleteResponse,
)
from ....crud import crud_pulse_survey, crud_survey_analysis
from ....services.dify_client import DifyClient
from ....models.pulse_survey import PulseSurvey
from ....models.user import User
from ....core.security import get_admin_user, get_current_user

router = APIRouter()
dify_client = DifyClient()

import traceback


async def process_dify_analysis(survey_id: int, memo: str, score: int, db: Session):
    try:
        if memo:
            result = await dify_client.run_analysis(memo, score)
            crud_survey_analysis.update_analysis_result(db, survey_id, result)
    except Exception as e:
        print("Dify Analysis Failed")
        print(e)
        traceback.print_exc()


@router.post("/", response_model=PulseSurveyResponse)
def create_pulse_survey(
    *,
    db: Session = Depends(get_db),
    obj_in: PulseSurveyCreate,
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks
):
    existing = db.query(PulseSurvey).filter(
        PulseSurvey.user_id == current_user.id,
        PulseSurvey.survey_date == obj_in.survey_date
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="本日のサーベイは既に回答済みです"
        )

    survey = crud_pulse_survey.create_survey(
        db,
        obj_in,
        user_id=current_user.id
    )

    background_tasks.add_task(
        process_dify_analysis,
        survey.id,
        survey.memo,
        survey.score,
        db
    )

    return survey


@router.delete("/", response_model=PulseSurveyDeleteResponse)
def delete_pulse_survey(
    *,
    db: Session = Depends(get_db),
    user_id: int = Query(..., description="削除対象のユーザーID"),
    survey_date: date = Query(..., description="削除対象の日付"),
    admin_user: User = Depends(get_admin_user),
):
    target = crud_pulse_survey.get_survey_by_user_and_date(
        db=db,
        user_id=user_id,
        survey_date=survey_date,
    )

    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定されたPulse Surveyは存在しません"
        )

    crud_pulse_survey.delete_survey_by_user_and_date(
        db=db,
        user_id=user_id,
        survey_date=survey_date,
    )

    return PulseSurveyDeleteResponse(
        message="Pulse Surveyを削除しました",
        deleted_user_id=user_id,
        deleted_survey_date=survey_date,
    )