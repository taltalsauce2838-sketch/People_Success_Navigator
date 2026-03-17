from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.models.pulse_survey import PulseSurvey
from app.models.risk_alert import RiskAlert, RiskLevel
from app.models.user import User
from app.services.dify_client import DifyClient2


dify_client = DifyClient2()


def _normalize_end_survey_date(end_survey_date: date | datetime | None) -> date:
    if end_survey_date is None:
        return datetime.utcnow().date()
    if isinstance(end_survey_date, datetime):
        return end_survey_date.date()
    return end_survey_date


async def generate_risk_alerts_for_manager(
    db: Session,
    manager_id: int,
    days: int = 3,
    end_survey_date: date | datetime | None = None,
) -> dict[str, Any]:
    """
    マネージャー配下の社員について、指定期間の Survey を集計して
    RiskAlert を生成する共通サービス。

    - 手動API実行では end_survey_date 未指定で「今日まで」を対象
    - 日次バッチでは end_survey_date に前日を渡して「前日まで」を対象
    """

    target_end_date = _normalize_end_survey_date(end_survey_date)
    start_survey_date = target_end_date - timedelta(days=max(days - 1, 0))

    members = db.query(User).filter(User.manager_id == manager_id).all()
    results: list[dict[str, Any]] = []

    for member in members:
        member_result = await generate_risk_alert_for_member(
            db=db,
            user_id=member.id,
            start_survey_date=start_survey_date,
            end_survey_date=target_end_date,
        )
        if not member_result:
            continue

        results.append({
            "user_id": member.id,
            "name": member.name,
            **member_result,
        })

    db.commit()

    return {
        "generated_count": len(results),
        "manager_id": manager_id,
        "days": days,
        "survey_start_date": start_survey_date.isoformat(),
        "survey_end_date": target_end_date.isoformat(),
        "results": results,
    }


async def generate_risk_alert_for_member(
    db: Session,
    user_id: int,
    start_survey_date: date,
    end_survey_date: date,
) -> dict[str, Any] | None:
    """
    指定ユーザーの Survey を集計して RiskAlert を1件生成する。
    survey_date 基準で対象期間を切り出す。
    """

    surveys = (
        db.query(PulseSurvey)
        .filter(
            PulseSurvey.user_id == user_id,
            PulseSurvey.survey_date >= start_survey_date,
            PulseSurvey.survey_date <= end_survey_date,
        )
        .order_by(PulseSurvey.survey_date.asc(), PulseSurvey.created_at.asc())
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

    is_resolved = False if status == RiskLevel.high else True

    alert = RiskAlert(
        user_id=user_id,
        status=status,
        confidence=confidence,
        reason=reason,
        is_resolved=is_resolved,
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
        "requires_action": not is_resolved,
        "is_resolved": is_resolved,
    }
