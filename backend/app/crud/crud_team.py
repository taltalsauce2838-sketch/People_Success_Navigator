from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.user import User
from app.models.risk_alert import RiskAlert
from app.models.pulse_survey import PulseSurvey


def get_team_members_with_status(db: Session, manager_id: int):
    """
    managerの部下一覧と
    最新survey
    risk_alert
    を取得
    """

    # 最新survey取得サブクエリ
    latest_survey_subquery = (
        db.query(
            PulseSurvey.user_id,
            func.max(PulseSurvey.survey_date).label("latest_date")
        )
        .group_by(PulseSurvey.user_id)
        .subquery()
    )

    query = (
        db.query(
            User.id,
            User.name,
            RiskAlert.status,
            PulseSurvey.score
        )

        # managerの部下
        .filter(User.manager_id == manager_id)

        # survey join
        .outerjoin(
            latest_survey_subquery,
            latest_survey_subquery.c.user_id == User.id
        )

        .outerjoin(
            PulseSurvey,
            (PulseSurvey.user_id == User.id)
            &
            (PulseSurvey.survey_date == latest_survey_subquery.c.latest_date)
        )

        # risk_alert join
        .outerjoin(
            RiskAlert,
            RiskAlert.user_id == User.id
        )
    )

    return query.all()