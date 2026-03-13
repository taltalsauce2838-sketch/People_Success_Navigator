from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date, timedelta
from collections import defaultdict

from app.db.session import get_db

# ===== 既存CRUD（一覧用）=====
from app.crud.crud_team import get_team_members_with_status

# ===== スキーマ =====
from app.schemas.team import TeamStatusResponse, TeamMember, TeamSummary

# ===== モデル（グラフ用）=====
from app.models.user import User
from app.models.pulse_survey import PulseSurvey

router = APIRouter()


# 仮のログインユーザー
class CurrentUser:
    id = 1


def get_current_user():
    return CurrentUser()

# ============================================================
# ① チーム状況一覧
# ============================================================
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

# ============================================================
# ② チーム健康状態グラフ（新規）
# ============================================================
@router.get("/team-health")
def get_team_health(
    days: int = Query(30, description="取得日数"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    チームメンバーのコンディション推移グラフ用データ
    （全メンバーを1つのグラフに重ねる）
    """

    manager_id = current_user.id

    # -------------------------------
    # ① チームメンバー取得
    # -------------------------------
    team_members = (
        db.query(User)
        .filter(User.manager_id == manager_id)
        .all()
    )

    if not team_members:
        return {"labels": [], "datasets": []}

    member_ids = [m.id for m in team_members]

    # -------------------------------
    # ② 期間設定
    # -------------------------------
    end_date = date.today()
    start_date = end_date - timedelta(days=days - 1)

    # -------------------------------
    # ③ サーベイ取得（期間内）
    # -------------------------------
    surveys = (
        db.query(PulseSurvey)
        .filter(
            PulseSurvey.user_id.in_(member_ids),
            PulseSurvey.survey_date >= start_date,
            PulseSurvey.survey_date <= end_date,
        )
        .all()
    )

    # -------------------------------
    # ④ 日付軸作成
    # -------------------------------
    labels = []
    current = start_date

    while current <= end_date:
        labels.append(current.strftime("%m/%d"))
        current += timedelta(days=1)

    # -------------------------------
    # ⑤ ユーザーごとに整理
    # -------------------------------
    survey_map = defaultdict(dict)

    for s in surveys:
        survey_map[s.user_id][s.survey_date] = s.score

    # -------------------------------
    # ⑥ datasets 作成
    # -------------------------------
    datasets = []

    for member in team_members:
        data = []

        current = start_date
        while current <= end_date:

            score = survey_map[member.id].get(current)

            data.append(score if score is not None else None)

            current += timedelta(days=1)

        datasets.append({
            "label": member.name,
            "data": data
        })

    # -------------------------------
    # ⑦ 返却
    # -------------------------------
    return {
        "labels": labels,
        "datasets": datasets
    }