from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date, timedelta
from collections import defaultdict

from app.db.session import get_db
from app.crud.crud_team import get_team_members_with_status
from app.schemas.team import TeamStatusResponse, TeamMember, TeamSummary
from app.models.user import User
from app.models.pulse_survey import PulseSurvey
from app.core.security import get_current_user

router = APIRouter()


def _role_value(user: User) -> str:
    return user.role.value if hasattr(user.role, "value") else str(user.role)


def _manager_scope_id(user: User) -> int | None:
    role_value = _role_value(user)
    if role_value not in ["manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="team-status は manager / admin のみ利用できます"
        )
    if role_value == "admin":
        return None
    return user.id


@router.get("/team-status", response_model=TeamStatusResponse)
def get_team_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    manager_id = _manager_scope_id(current_user)
    rows = get_team_members_with_status(db, manager_id)

    members = []
    scores = []

    for row in rows:
        member = TeamMember(
            user_id=row.id,
            name=row.name,
            risk_level=row.status,
            latest_survey_score=row.score
        )

        if row.score is not None:
            scores.append(row.score)

        members.append(member)

    member_count = len(members)
    avg_score = sum(scores) / len(scores) if scores else None

    summary = TeamSummary(
        member_count=member_count,
        avg_survey_score=avg_score
    )

    return TeamStatusResponse(
        team_summary=summary,
        members=members
    )


@router.get("/team-health")
def get_team_health(
    days: int = Query(30, ge=1, le=90, description="取得日数"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    チームメンバーのコンディション推移グラフ用データ
    （全メンバーを1つのグラフに重ねる）
    """

    manager_id = _manager_scope_id(current_user)

    team_members_query = db.query(User)
    if manager_id is not None:
        team_members_query = team_members_query.filter(User.manager_id == manager_id)

    team_members = team_members_query.order_by(User.id.asc()).all()

    if not team_members:
        return {"labels": [], "datasets": []}

    member_ids = [m.id for m in team_members]
    end_date = date.today()
    start_date = end_date - timedelta(days=days - 1)

    surveys = (
        db.query(PulseSurvey)
        .filter(
            PulseSurvey.user_id.in_(member_ids),
            PulseSurvey.survey_date >= start_date,
            PulseSurvey.survey_date <= end_date,
        )
        .order_by(PulseSurvey.user_id.asc(), PulseSurvey.survey_date.asc())
        .all()
    )

    labels = []
    current = start_date
    while current <= end_date:
        labels.append(current.strftime("%m/%d"))
        current += timedelta(days=1)

    survey_map = defaultdict(dict)
    for s in surveys:
        survey_map[s.user_id][s.survey_date] = s.score

    datasets = []
    for member in team_members:
        data = []
        current = start_date
        while current <= end_date:
            score = survey_map[member.id].get(current)
            data.append(score if score is not None else None)
            current += timedelta(days=1)

        datasets.append({
            "user_id": member.id,
            "label": member.name,
            "data": data
        })

    return {
        "labels": labels,
        "datasets": datasets
    }
