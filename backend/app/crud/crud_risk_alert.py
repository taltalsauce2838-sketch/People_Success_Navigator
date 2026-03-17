from datetime import date, datetime, timedelta

from sqlalchemy import and_, case, func, or_
from sqlalchemy.orm import Session

from app.models.risk_alert import RiskAlert, RiskLevel
from app.models.user import User


def get_team_risk_status(
    db: Session,
    manager_id: int | None,
    days: int | None = None,
):
    date_filter = None
    if days is not None:
        date_filter = date.today() - timedelta(days=max(days - 1, 0))

    latest_alert_subquery = db.query(
        RiskAlert.user_id.label("user_id"),
        func.max(RiskAlert.evaluation_end_date).label("latest_evaluation_end_date"),
    ).join(User, User.id == RiskAlert.user_id)

    if manager_id is not None:
        latest_alert_subquery = latest_alert_subquery.filter(User.manager_id == manager_id)

    if date_filter is not None:
        latest_alert_subquery = latest_alert_subquery.filter(RiskAlert.evaluation_end_date >= date_filter)

    latest_alert_subquery = latest_alert_subquery.group_by(RiskAlert.user_id).subquery()

    latest_alert_id_subquery = (
        db.query(
            RiskAlert.user_id.label("user_id"),
            RiskAlert.evaluation_end_date.label("evaluation_end_date"),
            func.max(RiskAlert.id).label("latest_alert_id"),
        )
        .group_by(RiskAlert.user_id, RiskAlert.evaluation_end_date)
        .subquery()
    )

    risk_order = case(
        (RiskAlert.is_resolved.is_(False), 0),
        else_=1,
    )

    severity_order = case(
        (RiskAlert.status == RiskLevel.high, 0),
        (RiskAlert.status == RiskLevel.medium, 1),
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
            RiskAlert.created_at,
            RiskAlert.updated_at,
            RiskAlert.judged_at,
            RiskAlert.evaluation_start_date,
            RiskAlert.evaluation_end_date,
            RiskAlert.execution_type,
        )
        .join(latest_alert_subquery, latest_alert_subquery.c.user_id == User.id)
        .join(
            latest_alert_id_subquery,
            and_(
                latest_alert_id_subquery.c.user_id == User.id,
                latest_alert_id_subquery.c.evaluation_end_date == latest_alert_subquery.c.latest_evaluation_end_date,
            ),
        )
        .join(RiskAlert, RiskAlert.id == latest_alert_id_subquery.c.latest_alert_id)
    )

    if manager_id is not None:
        query = query.filter(User.manager_id == manager_id)

    return query.order_by(
        risk_order.asc(),
        severity_order.asc(),
        RiskAlert.evaluation_end_date.desc(),
        RiskAlert.updated_at.desc(),
        User.id.asc(),
    ).all()


def resolve_team_risk_alert(
    db: Session,
    *,
    alert_id: int,
    manager_id: int | None,
    is_resolved: bool = True,
) -> RiskAlert | None:
    alert = db.query(RiskAlert).join(User, User.id == RiskAlert.user_id).filter(RiskAlert.id == alert_id)

    if manager_id is not None:
        alert = alert.filter(User.manager_id == manager_id)

    alert = alert.first()
    if not alert:
        return None

    alert.is_resolved = bool(is_resolved)
    alert.updated_at = datetime.utcnow()
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert
