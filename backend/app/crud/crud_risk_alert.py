from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.models.user import User
from app.models.risk_alert import RiskAlert


def get_team_risk_status(
    db: Session,
    manager_id: int,
    days: int | None = None
):

    # ---- 期間フィルタ ----
    date_filter = None
    if days is not None:
        date_filter = datetime.utcnow() - timedelta(days=days)

    # ---- 最新アラート取得サブクエリ ----
    latest_alert_subquery = (
        db.query(
            RiskAlert.user_id,
            func.max(RiskAlert.created_at).label("latest_date")
        )
        .group_by(RiskAlert.user_id)
    )

    if date_filter:
        latest_alert_subquery = latest_alert_subquery.filter(
            RiskAlert.created_at >= date_filter
        )

    latest_alert_subquery = latest_alert_subquery.subquery()

    # ---- メインクエリ ----
    query = (
        db.query(
            User.id,
            User.name,
            RiskAlert.status,
            RiskAlert.confidence,
            RiskAlert.is_resolved,
            RiskAlert.created_at
        )
        .filter(User.manager_id == manager_id)

        # 最新アラート
        .outerjoin(
            latest_alert_subquery,
            latest_alert_subquery.c.user_id == User.id
        )

        .outerjoin(
            RiskAlert,
            (RiskAlert.user_id == User.id)
            &
            (RiskAlert.created_at == latest_alert_subquery.c.latest_date)
        )
    )

    return query.all()