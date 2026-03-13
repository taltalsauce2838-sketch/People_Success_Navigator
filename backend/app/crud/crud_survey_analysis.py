from ..models.survey_analysis import SurveyAnalysis

def update_analysis_result(db, survey_id: int, result: dict):
    analysis = SurveyAnalysis(
        pulse_survey_id=survey_id,
        sentiment_score=result["sentiment_score"],
        reason=result["reason"],
    )

    db.add(analysis)
    db.commit()