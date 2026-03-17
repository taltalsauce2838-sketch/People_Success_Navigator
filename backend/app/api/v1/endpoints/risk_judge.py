from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.services.risk_judge_service import (
    generate_risk_alerts_for_manager,
    generate_risk_alerts_for_managers,
)

router = APIRouter()


@router.post("/generate")
async def generate_risk_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    days: int = Query(
        7,
        ge=1,
        le=15,
        description="分析対象日数（デフォルト7日）"
    ),
    manager_id: int | None = Query(
        default=None,
        description="admin のみ指定可能。未指定時は全 manager を対象に実行"
    ),
):
    """
    前日までの直近N日分のサーベイから離職リスクを生成または更新。
    """

    role_value = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_value not in {"manager", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="離職リスク再判定は manager / admin のみ実行できます",
        )

    end_survey_date = datetime.utcnow().date() - timedelta(days=1)

    if role_value == "manager":
        if manager_id is not None and manager_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="manager は自チーム以外を指定できません",
            )
        return await generate_risk_alerts_for_manager(
            db=db,
            manager_id=current_user.id,
            days=days,
            end_survey_date=end_survey_date,
            execution_type="manual",
        )

    if manager_id is not None:
        manager = db.query(User).filter(User.id == manager_id, User.role == UserRole.manager).first()
        if not manager:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="指定された manager_id の manager が見つかりません",
            )
        return await generate_risk_alerts_for_manager(
            db=db,
            manager_id=manager_id,
            days=days,
            end_survey_date=end_survey_date,
            execution_type="manual",
        )

    manager_ids = [
        user.id
        for user in db.query(User.id)
        .filter(User.role == UserRole.manager)
        .order_by(User.id.asc())
        .all()
    ]

    return await generate_risk_alerts_for_managers(
        db=db,
        manager_ids=manager_ids,
        days=days,
        end_survey_date=end_survey_date,
        execution_type="manual",
    )
