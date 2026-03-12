from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from ....db.session import get_db
from ....schemas.pulse_survey import PulseSurveyCreate, PulseSurveyResponse
from ....crud import crud_pulse_survey
from ....services.dify_client import DifyClient
from ....models.pulse_survey import PulseSurvey
# from ...deps import get_current_user # 認証用

router = APIRouter()
dify_client = DifyClient()

async def process_dify_analysis(survey_id: int, memo: str, score: int, db: Session):
    """バックグラウンドで実行されるAI分析タスク"""
    try:
        if memo: # メモがある場合のみ分析
            result = await dify_client.run_analysis(survey_id, memo, score)
            crud_pulse_survey.update_analysis_result(db, survey_id, result)
    except Exception as e:
        print(f"Dify Analysis Failed: {e}")
        # 必要に応じてエラーログをDBに記録

@router.post("/", response_model=PulseSurveyResponse)
def create_pulse_survey(
    *,
    db: Session = Depends(get_db),
    obj_in: PulseSurveyCreate,
    current_user = 1,
#    current_user = Depends(get_current_user),
    background_tasks: BackgroundTasks
):

    existing = db.query(PulseSurvey).filter(
    PulseSurvey.user_id == current_user,
    PulseSurvey.survey_date == obj_in.survey_date
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="本日のサーベイは既に回答済みです")

    # 1. データの保存
#    survey = crud_pulse_survey.create_survey(db, obj_in, user_id=current_user.id)
    survey = crud_pulse_survey.create_survey(db, obj_in, user_id=1)   
    # 2. AI分析をバックグラウンドジョブに追加
    background_tasks.add_task(process_dify_analysis, survey.id, survey.memo, survey.score, db)
    
    # 3. ユーザーには即座にレスポンス
    return survey