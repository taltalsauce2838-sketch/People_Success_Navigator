from sqlalchemy.orm import Session
from ..models.pulse_survey import PulseSurvey
from ..schemas.pulse_survey import PulseSurveyCreate

def create_survey(db: Session, obj_in: PulseSurveyCreate, user_id: int):
    db_obj = PulseSurvey(
        user_id=user_id,
        score=obj_in.score,
        memo=obj_in.memo,
        survey_date=obj_in.survey_date
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_analysis_result(db: Session, survey_id: int, analysis_data: dict):
    # ここでSurveyAnalysisテーブルへの保存やPulseSurveyのフラグ更新を行う
    # 実装例: analysis = SurveyAnalysis(pulse_survey_id=survey_id, result=analysis_data["outputs"]["text"])
    pass