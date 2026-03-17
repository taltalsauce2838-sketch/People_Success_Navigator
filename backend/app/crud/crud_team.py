from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.models.user import User
from app.models.risk_alert import RiskAlert
from app.models.pulse_survey import PulseSurvey


def get_team_members_with_status(db: Session, manager_id: int):
    """
    manager の部下一覧と
    最新 survey
    最新 risk_alert
    を取得
    """

    # 最新 survey 日付
    latest_survey_date_subquery = (
        db.query(
            PulseSurvey.user_id.label("user_id"),
            func.max(PulseSurvey.survey_date).label("latest_date")
        )
        .group_by(PulseSurvey.user_id)
        .subquery()
    )

    # 最新 survey 本体
    latest_survey_subquery = (
        db.query(
            PulseSurvey.user_id.label("user_id"),
            PulseSurvey.score.label("score"),
            PulseSurvey.survey_date.label("survey_date")
        )
        .join(
            latest_survey_date_subquery,
            and_(
                PulseSurvey.user_id == latest_survey_date_subquery.c.user_id,
                PulseSurvey.survey_date == latest_survey_date_subquery.c.latest_date,
            )
        )
        .subquery()
    )

    # 最新 risk_alert id
    latest_alert_id_subquery = (
        db.query(
            RiskAlert.user_id.label("user_id"),
            func.max(RiskAlert.id).label("latest_alert_id")
        )
        .group_by(RiskAlert.user_id)
        .subquery()
    )

    # 最新 risk_alert 本体
    latest_alert_subquery = (
        db.query(
            RiskAlert.user_id.label("user_id"),
            RiskAlert.status.label("status")
        )
        .join(
            latest_alert_id_subquery,
            RiskAlert.id == latest_alert_id_subquery.c.latest_alert_id
        )
        .subquery()
    )

    query = (
        db.query(
            User.id,
            User.name,
            latest_alert_subquery.c.status,
            latest_survey_subquery.c.score
        )
        .filter(User.manager_id == manager_id)
        .outerjoin(
            latest_survey_subquery,
            latest_survey_subquery.c.user_id == User.id
        )
        .outerjoin(
            latest_alert_subquery,
            latest_alert_subquery.c.user_id == User.id
        )
        .order_by(User.id.asc())
    )

    return query.all()