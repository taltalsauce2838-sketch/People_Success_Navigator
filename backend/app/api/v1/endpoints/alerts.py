from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud.crud_risk_alert import get_team_risk_status

router = APIRouter()

# 仮ログインユーザー
class CurrentUser:
    id = 1

def get_current_user():
    return CurrentUser()

@router.get("/team-risk")
def get_team_risk(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    days: int | None = Query(
        default=None,
        description="直近何日分のアラートを取得するか（例: 3, 7）"
    )
):

    manager_id = current_user.id

    rows = get_team_risk_status(db, manager_id, days)

    members = []

    for row in rows:
        members.append({
            "user_id": row.id,
            "name": row.name,
            "risk_level": row.status,
            "confidence": row.confidence,
            "is_resolved": row.is_resolved,
            "last_alert_date": row.created_at
        })

    return {
        "member_count": len(members),
        "members": members
    }