from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud.crud_team import get_team_members_with_status
from app.schemas.team import TeamStatusResponse, TeamMember, TeamSummary

router = APIRouter()


# 仮のログインユーザー
class CurrentUser:
    id = 1


def get_current_user():
    return CurrentUser()


@router.get("/team-status", response_model=TeamStatusResponse)
def get_team_status(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):

    manager_id = current_user.id

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

    avg_score = None
    if len(scores) > 0:
        avg_score = sum(scores) / len(scores)

    summary = TeamSummary(
        member_count=member_count,
        avg_survey_score=avg_score
    )

    return TeamStatusResponse(
        team_summary=summary,
        members=members
    )