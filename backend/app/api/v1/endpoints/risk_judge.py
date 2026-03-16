from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.pulse_survey import PulseSurvey
from app.models.survey_analysis import SurveyAnalysis
from app.models.risk_alert import RiskAlert
from app.services.dify_client import DifyClient2

router = APIRouter()
dify_client = DifyClient2()


@router.post("/generate")
async def generate_risk_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    days: int = Query(7, description="分析対象日数")
):
    """
    直近N日分のサーベイから離職リスクを生成
    """

    manager_id = current_user.id
    start_date = datetime.utcnow() - timedelta(days=days)

    # ---- マネージャー配下の社員取得 ----
    members = db.query(User).filter(User.manager_id == manager_id).all()

    results = []

    for member in members:

        # ---- サーベイ取得 ----
        surveys = (
            db.query(PulseSurvey)
            .filter(
                PulseSurvey.user_id == member.id,
                PulseSurvey.created_at >= start_date
            )
            .all()
        )

        if not surveys:
            continue

        survey_ids = [s.id for s in surveys]

        # ---- AI分析結果取得 ----
        analyses = (
            db.query(SurveyAnalysis)
            .filter(SurveyAnalysis.pulse_survey_id.in_(survey_ids))
            .all()
        )

        # ---- AIに渡すデータ作成 ----
        ai_input = {
            "scores": [s.score for s in surveys],
            "memos": [s.memo for s in surveys if s.memo],
            "sentiments": [a.sentiment_score for a in analyses],
        }

        # ---- Difyで離職判定 ----
        print("ai_input:", ai_input)
        ai_result = await dify_client.run_risk_assessment(ai_input)

        # 想定レスポンス
        status = ai_result.get("status", "low")
        confidence = ai_result.get("confidence", 0.5)
        reason = ai_result.get("reason", "")

        # ---- アラート保存 ----
        alert = RiskAlert(
            user_id=member.id,
            status=status,
            confidence=confidence,
            reason=reason,
            ai_model="dify",
            is_resolved=False,
            created_at=datetime.utcnow()
        )

        db.add(alert)

        results.append({
            "user_id": member.id,
            "name": member.name,
            "risk_level": status,
            "confidence": confidence,
            "reason": reason
        })

    db.commit()

    return {
        "generated_count": len(results),
        "results": results
    }