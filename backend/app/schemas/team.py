from pydantic import BaseModel
from typing import List, Optional


class TeamMember(BaseModel):
    """
    チームメンバー1人分の情報
    """

    user_id: int
    name: str
    risk_level: Optional[str]
    latest_survey_score: Optional[int]


class TeamSummary(BaseModel):
    """
    チーム全体の集計情報
    """

    member_count: int
    avg_survey_score: Optional[float]


class TeamStatusResponse(BaseModel):
    """
    APIレスポンス全体
    """

    team_summary: TeamSummary
    members: List[TeamMember]