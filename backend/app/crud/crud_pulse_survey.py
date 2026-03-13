from datetime import date
from sqlalchemy.orm import Session

from ..models.pulse_survey import PulseSurvey
from ..schemas.pulse_survey import PulseSurveyCreate


def create_survey(db: Session, obj_in: PulseSurveyCreate, user_id: int):
    db_obj = PulseSurvey(
        user_id=user_id,
        score=obj_in.score,
        memo=obj_in.memo,
        survey_date=obj_in.survey_date
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def get_survey_by_user_and_date(db: Session, user_id: int, survey_date: date):
    return db.query(PulseSurvey).filter(
        PulseSurvey.user_id == user_id,
        PulseSurvey.survey_date == survey_date
    ).first()


def delete_survey_by_user_and_date(db: Session, user_id: int, survey_date: date):
    target = get_survey_by_user_and_date(db, user_id, survey_date)

    if not target:
        return None

    db.delete(target)
    db.commit()
    return target
