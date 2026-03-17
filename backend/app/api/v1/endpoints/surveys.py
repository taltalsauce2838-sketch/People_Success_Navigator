from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, Query, status
from sqlalchemy.orm import Session

from ....db.session import SessionLocal, get_db
from ....schemas.pulse_survey import (
    PulseSurveyCreate,
    PulseSurveyResponse,
    PulseSurveyDeleteResponse,
    PulseSurveyTrendResponse,
)
from ....crud import crud_pulse_survey, crud_survey_analysis
from ....services.dify_client import DifyClient
from ....services.risk_judge_service import generate_risk_alerts_for_manager
from ....models.pulse_survey import PulseSurvey
from ....models.user import User
from ....core.security import get_admin_user, get_current_user

router = APIRouter()
dify_client = DifyClient()

import traceback


async def process_post_survey_tasks(survey_id: int, memo: str, score: int, user_id: int, manager_id: int | None):
    db = SessionLocal()
    try:
        if memo:
            result = await dify_client.run_analysis(memo, score)
            crud_survey_analysis.update_analysis_result(db, survey_id, result)

        if manager_id:
            await generate_risk_alerts_for_manager(db, manager_id=manager_id, days=3)
    except Exception as e:
        print("Post Survey Background Task Failed")
        print(e)
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

def get_visible_user_ids_for_manager(db: Session, manager_user_id: int) -> list[int]:
    subordinate_ids = crud_pulse_survey.get_subordinate_user_ids(db, manager_user_id)
    return [manager_user_id] + subordinate_ids


def can_view_target_user(db: Session, current_user: User, target_user_id: int) -> bool:
    role_value = current_user.role.value if hasattr(current_user.role, "value") else current_user.role

    if role_value == "admin":
        return True

    if role_value == "user":
        return current_user.id == target_user_id

    if role_value == "manager":
        visible_ids = get_visible_user_ids_for_manager(db, current_user.id)
        return target_user_id in visible_ids

    return False


@router.get("/", response_model=List[PulseSurveyResponse])
def list_pulse_surveys(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    user_id: Optional[int] = Query(None, description="対象ユーザーID。未指定時は権限に応じた範囲を返す"),
):
    role_value = current_user.role.value if hasattr(current_user.role, "value") else current_user.role

    if role_value == "admin":
        if user_id is not None:
            return crud_pulse_survey.get_surveys_by_user_id(db, user_id)
        return crud_pulse_survey.get_all_surveys(db)

    if role_value == "user":
        if user_id is not None and user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="他ユーザーのPulse Surveyは閲覧できません"
            )
        return crud_pulse_survey.get_surveys_by_user_id(db, current_user.id)

    if role_value == "manager":
        visible_ids = get_visible_user_ids_for_manager(db, current_user.id)

        if user_id is not None:
            if user_id not in visible_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="配下以外のPulse Surveyは閲覧できません"
                )
            return crud_pulse_survey.get_surveys_by_user_id(db, user_id)

        return crud_pulse_survey.get_surveys_by_user_ids(db, visible_ids)

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="閲覧権限がありません"
    )


@router.get("/by-user-date", response_model=PulseSurveyResponse)
def get_pulse_survey_by_user_and_date(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    user_id: int = Query(..., description="対象ユーザーID"),
    survey_date: date = Query(..., description="対象日付"),
):
    if not can_view_target_user(db, current_user, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="指定ユーザーのPulse Surveyを閲覧する権限がありません"
        )

    survey = crud_pulse_survey.get_survey_by_user_and_date(
        db=db,
        user_id=user_id,
        survey_date=survey_date,
    )

    if not survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定されたPulse Surveyは存在しません"
        )

    return survey

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
        process_post_survey_tasks,
        survey.id,
        survey.memo,
        survey.score,
        current_user.id,
        current_user.manager_id,
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