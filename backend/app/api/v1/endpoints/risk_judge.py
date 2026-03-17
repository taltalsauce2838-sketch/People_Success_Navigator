from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.risk_judge_service import generate_risk_alerts_for_manager

router = APIRouter()


@router.post("/generate")
async def generate_risk_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    days: int = Query(
        3,
        ge=1,
        le=15,
        description="分析対象日数（デフォルト3日）"
    )
):
    """
    直近N日分のサーベイから離職リスクを生成
    """

    role_value = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_value not in {"manager", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="離職リスク再判定は manager / admin のみ実行できます",
        )

    manager_id = current_user.id

    return await generate_risk_alerts_for_manager(
        db=db,
        manager_id=manager_id,
        days=days,
    )
