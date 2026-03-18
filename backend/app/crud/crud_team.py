from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.models.user import User
from app.models.risk_alert import RiskAlert
from app.models.pulse_survey import PulseSurvey


def get_team_members_with_status(db: Session, manager_id: int | None):
    """
    manager の部下一覧と
    最新 survey
    最新 risk_alert
    を取得
    """

    latest_survey_date_subquery = (
        db.query(
            PulseSurvey.user_id.label("user_id"),
            func.max(PulseSurvey.survey_date).label("latest_date")
        )
        .group_by(PulseSurvey.user_id)
        .subquery()
    )

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

    latest_alert_date_subquery = db.query(
        RiskAlert.user_id.label("user_id"),
        func.max(RiskAlert.evaluation_end_date).label("latest_evaluation_end_date"),
    ).group_by(RiskAlert.user_id)

    if manager_id is not None:
        latest_alert_date_subquery = latest_alert_date_subquery.join(User, User.id == RiskAlert.user_id).filter(
            User.manager_id == manager_id
        )

    latest_alert_date_subquery = latest_alert_date_subquery.subquery()

    latest_alert_id_subquery = (
        db.query(
            RiskAlert.user_id.label("user_id"),
            RiskAlert.evaluation_end_date.label("evaluation_end_date"),
            func.max(RiskAlert.id).label("latest_alert_id")
        )
        .group_by(RiskAlert.user_id, RiskAlert.evaluation_end_date)
        .subquery()
    )

    latest_alert_subquery = (
        db.query(
            RiskAlert.user_id.label("user_id"),
            RiskAlert.status.label("status")
        )
        .join(
            latest_alert_id_subquery,
            RiskAlert.id == latest_alert_id_subquery.c.latest_alert_id
        )
        .join(
            latest_alert_date_subquery,
            and_(
                latest_alert_date_subquery.c.user_id == latest_alert_id_subquery.c.user_id,
                latest_alert_date_subquery.c.latest_evaluation_end_date == latest_alert_id_subquery.c.evaluation_end_date,
            )
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
        .outerjoin(
            latest_survey_subquery,
            latest_survey_subquery.c.user_id == User.id
        )
        .outerjoin(
            latest_alert_subquery,
            latest_alert_subquery.c.user_id == User.id
        )
    )

    if manager_id is not None:
        query = query.filter(User.manager_id == manager_id)

    return query.order_by(User.id.asc()).all()
