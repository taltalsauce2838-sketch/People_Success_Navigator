from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.models.pulse_survey import PulseSurvey
from app.models.risk_alert import RiskAlert, RiskLevel
from app.models.user import User
from app.services.dify_client import DifyClient2


dify_client = DifyClient2()


async def generate_risk_alerts_for_manager(
    db: Session,
    manager_id: int,
    days: int = 3,
) -> dict[str, Any]:
    """
    マネージャー配下のメンバーについて、直近N日分のSurveyを集計して
    RiskAlert を生成する共通サービス。
    Pulse登録時の自動実行と、手動API実行の両方から利用する。
    """

    start_date = datetime.utcnow() - timedelta(days=days)
    members = db.query(User).filter(User.manager_id == manager_id).all()

    results: list[dict[str, Any]] = []

    for member in members:
        member_result = await generate_risk_alert_for_member(
            db=db,
            user_id=member.id,
            days=days,
            start_date=start_date,
        )
        if not member_result:
            continue

        results.append(
            {
                "user_id": member.id,
                "name": member.name,
                **member_result,
            }
        )

    db.commit()

    return {
        "generated_count": len(results),
        "manager_id": manager_id,
        "days": days,
        "results": results,
    }


async def generate_risk_alert_for_member(
    db: Session,
    user_id: int,
    days: int = 3,
    start_date: datetime | None = None,
) -> dict[str, Any] | None:
    """
    指定ユーザーの直近N日分のSurveyからRiskAlertを1件生成する。
    ユーザーにmanagerがいない場合や、対象Surveyが無い場合は None を返す。
    """

    start_date = start_date or (datetime.utcnow() - timedelta(days=days))

    surveys = (
        db.query(PulseSurvey)
        .filter(
            PulseSurvey.user_id == user_id,
            PulseSurvey.created_at >= start_date,
        )
        .order_by(PulseSurvey.created_at.asc())
        .all()
    )

    if not surveys:
        return None

    ai_input = {
        "scores": [survey.score for survey in surveys],
        "memos": [survey.memo for survey in surveys if survey.memo],
    }

    ai_result = await dify_client.run_risk_assessment(ai_input)

    status_raw = str(ai_result.get("status", RiskLevel.low.value)).lower()
    try:
        status = RiskLevel(status_raw)
    except ValueError:
        status = RiskLevel.low

    confidence = float(ai_result.get("confidence", 0.5) or 0.5)
    reason = ai_result.get("reason", "") or ""

    requires_action = status == RiskLevel.high

    alert = RiskAlert(
        user_id=user_id,
        status=status,
        confidence=confidence,
        reason=reason,
        is_resolved=not requires_action,
        created_at=datetime.utcnow(),
    )

    db.add(alert)
    db.flush()

    return {
        "risk_level": status.value,
        "confidence": confidence,
        "reason": reason,
        "survey_count": len(surveys),
        "latest_survey_id": surveys[-1].id,
        "requires_action": requires_action,
        "is_resolved": not requires_action,
    }
