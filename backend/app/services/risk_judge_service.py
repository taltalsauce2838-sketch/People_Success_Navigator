from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Iterable

from sqlalchemy.orm import Session

from app.models.pulse_survey import PulseSurvey
from app.models.risk_alert import RiskAlert, RiskExecutionType, RiskLevel
from app.models.user import User
from app.services.dify_client import DifyClient2


dify_client = DifyClient2()


def _normalize_end_survey_date(end_survey_date: date | datetime | None) -> date:
    if end_survey_date is None:
        return datetime.utcnow().date() - timedelta(days=1)
    if isinstance(end_survey_date, datetime):
        return end_survey_date.date()
    return end_survey_date


def _normalize_execution_type(execution_type: str | RiskExecutionType) -> RiskExecutionType:
    if isinstance(execution_type, RiskExecutionType):
        return execution_type
    return RiskExecutionType(str(execution_type).lower())


async def generate_risk_alerts_for_manager(
    db: Session,
    manager_id: int,
    days: int = 7,
    end_survey_date: date | datetime | None = None,
    execution_type: str | RiskExecutionType = RiskExecutionType.manual,
) -> dict[str, Any]:
    """
    マネージャー配下の社員について、指定期間の Survey を集計して
    RiskAlert を生成または更新する共通サービス。

    - 手動API実行 / 日次バッチともに、end_survey_date 未指定時は「前日まで」を対象
    - 同一 user_id + evaluation_start_date + evaluation_end_date は update 扱い
    """

    target_end_date = _normalize_end_survey_date(end_survey_date)
    start_survey_date = target_end_date - timedelta(days=max(days - 1, 0))
    normalized_execution_type = _normalize_execution_type(execution_type)

    members = db.query(User).filter(User.manager_id == manager_id).all()
    results: list[dict[str, Any]] = []

    for member in members:
        member_result = await generate_risk_alert_for_member(
            db=db,
            user_id=member.id,
            start_survey_date=start_survey_date,
            end_survey_date=target_end_date,
            execution_type=normalized_execution_type,
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
        "execution_type": normalized_execution_type.value,
        "results": results,
    }


async def generate_risk_alerts_for_managers(
    db: Session,
    manager_ids: Iterable[int],
    days: int = 7,
    end_survey_date: date | datetime | None = None,
    execution_type: str | RiskExecutionType = RiskExecutionType.manual,
) -> dict[str, Any]:
    normalized_execution_type = _normalize_execution_type(execution_type)
    target_end_date = _normalize_end_survey_date(end_survey_date)
    manager_results: list[dict[str, Any]] = []

    for manager_id in manager_ids:
        result = await generate_risk_alerts_for_manager(
            db=db,
            manager_id=manager_id,
            days=days,
            end_survey_date=target_end_date,
            execution_type=normalized_execution_type,
        )
        manager_results.append(result)

    survey_start_date = (
        target_end_date - timedelta(days=max(days - 1, 0))
    ).isoformat()

    return {
        "manager_count": len(manager_results),
        "generated_count": sum(result.get("generated_count", 0) for result in manager_results),
        "days": days,
        "survey_start_date": survey_start_date,
        "survey_end_date": target_end_date.isoformat(),
        "execution_type": normalized_execution_type.value,
        "results": manager_results,
    }


async def generate_risk_alert_for_member(
    db: Session,
    user_id: int,
    start_survey_date: date,
    end_survey_date: date,
    execution_type: str | RiskExecutionType = RiskExecutionType.manual,
) -> dict[str, Any] | None:
    """
    指定ユーザーの Survey を集計して RiskAlert を1件生成または更新する。
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
    normalized_execution_type = _normalize_execution_type(execution_type)
    judged_at = datetime.utcnow()
    default_is_resolved = False if status == RiskLevel.high else True

    alert = (
        db.query(RiskAlert)
        .filter(
            RiskAlert.user_id == user_id,
            RiskAlert.evaluation_start_date == start_survey_date,
            RiskAlert.evaluation_end_date == end_survey_date,
        )
        .first()
    )

    action = "updated" if alert else "created"

    if alert:
        alert.status = status
        alert.reason = reason
        alert.confidence = confidence
        alert.judged_at = judged_at
        alert.execution_type = normalized_execution_type
        alert.updated_at = judged_at
    else:
        alert = RiskAlert(
            user_id=user_id,
            status=status,
            confidence=confidence,
            reason=reason,
            is_resolved=default_is_resolved,
            evaluation_start_date=start_survey_date,
            evaluation_end_date=end_survey_date,
            judged_at=judged_at,
            execution_type=normalized_execution_type,
            created_at=judged_at,
            updated_at=judged_at,
        )
        db.add(alert)

    db.flush()

    return {
        "alert_id": alert.id,
        "action": action,
        "risk_level": status.value,
        "confidence": confidence,
        "reason": reason,
        "survey_count": len(surveys),
        "latest_survey_id": surveys[-1].id,
        "requires_action": not bool(alert.is_resolved),
        "is_resolved": bool(alert.is_resolved),
        "evaluation_start_date": start_survey_date.isoformat(),
        "evaluation_end_date": end_survey_date.isoformat(),
        "judged_at": judged_at.isoformat(),
        "execution_type": normalized_execution_type.value,
    }
