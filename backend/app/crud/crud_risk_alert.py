from datetime import datetime, timedelta

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models.risk_alert import RiskAlert
from app.models.user import User


def get_team_risk_status(
    db: Session,
    manager_id: int,
    days: int | None = None
):
    date_filter = None
    if days is not None:
        date_filter = datetime.utcnow() - timedelta(days=days)

    latest_alert_subquery = (
        db.query(
            RiskAlert.user_id.label("user_id"),
            func.max(RiskAlert.created_at).label("latest_date")
        )
        .join(User, User.id == RiskAlert.user_id)
        .filter(User.manager_id == manager_id)
    )

    if date_filter is not None:
        latest_alert_subquery = latest_alert_subquery.filter(RiskAlert.created_at >= date_filter)

    latest_alert_subquery = latest_alert_subquery.group_by(RiskAlert.user_id).subquery()

    risk_order = case(
        (RiskAlert.is_resolved.is_(False), 0),
        else_=1,
    )

    severity_order = case(
        (RiskAlert.status == "high", 0),
        (RiskAlert.status == "medium", 1),
        else_=2,
    )

    query = (
        db.query(
            User.id,
            User.name,
            RiskAlert.id.label("alert_id"),
            RiskAlert.status,
            RiskAlert.reason,
            RiskAlert.confidence,
            RiskAlert.is_resolved,
            RiskAlert.created_at
        )
        .join(latest_alert_subquery, latest_alert_subquery.c.user_id == User.id)
        .join(
            RiskAlert,
            (RiskAlert.user_id == User.id)
            & (RiskAlert.created_at == latest_alert_subquery.c.latest_date)
        )
        .filter(User.manager_id == manager_id)
        .order_by(risk_order.asc(), severity_order.asc(), RiskAlert.created_at.desc(), User.id.asc())
    )

    return query.all()


def resolve_team_risk_alert(
    db: Session,
    *,
    alert_id: int,
    manager_id: int,
    is_resolved: bool = True,
) -> RiskAlert | None:
    alert = (
        db.query(RiskAlert)
        .join(User, User.id == RiskAlert.user_id)
        .filter(RiskAlert.id == alert_id, User.manager_id == manager_id)
        .first()
    )

    if not alert:
        return None

    alert.is_resolved = bool(is_resolved)
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert
