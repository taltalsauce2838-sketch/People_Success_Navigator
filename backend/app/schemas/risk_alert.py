from datetime import datetime

from pydantic import BaseModel, Field


class RiskAlertResolveRequest(BaseModel):
    is_resolved: bool = Field(default=True, description="true で対応完了として更新します")


class RiskAlertResolveResponse(BaseModel):
    alert_id: int
    user_id: int
    is_resolved: bool
    updated_at: datetime
