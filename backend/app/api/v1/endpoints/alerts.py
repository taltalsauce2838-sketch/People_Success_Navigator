from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud.crud_risk_alert import get_team_risk_status, resolve_team_risk_alert
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.risk_alert import RiskAlertResolveRequest, RiskAlertResolveResponse

router = APIRouter()


def _role_value(user: User) -> str:
    return user.role.value if hasattr(user.role, "value") else str(user.role)


def _get_scope_manager_id(current_user: User) -> int | None:
    role_value = _role_value(current_user)
    if role_value not in ["manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="alerts API は manager / admin のみ利用できます"
        )
    if role_value == "admin":
        return None
    return current_user.id


@router.get("/team-risk")
def get_team_risk(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    days: int | None = Query(
        default=None,
        ge=1,
        le=90,
        description="直近何日分のアラートを取得するか（例: 7, 14）"
    )
):
    manager_scope_id = _get_scope_manager_id(current_user)
    rows = get_team_risk_status(db, manager_scope_id, days)

    members = []
    unresolved_count = 0
    high_count = 0

    for row in rows:
        risk_level = row.status.value if hasattr(row.status, "value") else row.status
        execution_type = row.execution_type.value if hasattr(row.execution_type, "value") else row.execution_type
        reason = (row.reason or "").strip()
        is_resolved = bool(row.is_resolved)

        if not is_resolved:
            unresolved_count += 1
        if str(risk_level).lower() == "high":
            high_count += 1

        members.append({
            "alert_id": row.alert_id,
            "user_id": row.id,
            "name": row.name,
            "risk_level": risk_level,
            "confidence": row.confidence,
            "is_resolved": is_resolved,
            "reason": reason or None,
            "last_alert_date": row.evaluation_end_date,
            "evaluation_start_date": row.evaluation_start_date,
            "evaluation_end_date": row.evaluation_end_date,
            "judged_at": row.judged_at,
            "updated_at": row.updated_at,
            "execution_type": execution_type,
        })

    return {
        "member_count": len(members),
        "unresolved_count": unresolved_count,
        "high_count": high_count,
        "members": members
    }


@router.post("/{alert_id}/resolve", response_model=RiskAlertResolveResponse)
def post_resolve_team_risk_alert(
    alert_id: int,
    payload: RiskAlertResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    manager_scope_id = _get_scope_manager_id(current_user)

    updated = resolve_team_risk_alert(
        db,
        alert_id=alert_id,
        manager_id=manager_scope_id,
        is_resolved=payload.is_resolved,
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="対象アラートが見つからないか、更新権限がありません"
        )

    return {
        "alert_id": updated.id,
        "user_id": updated.user_id,
        "is_resolved": bool(updated.is_resolved),
        "updated_at": updated.updated_at,
    }
