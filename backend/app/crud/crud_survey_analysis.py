from ..models.survey_analysis import SurveyAnalysis
from ..models.pulse_survey import PulseSurvey


def update_analysis_result(db, survey_id: int, result: dict):
    pulse_survey = db.query(PulseSurvey).filter(
        PulseSurvey.id == survey_id
    ).first()

    if not pulse_survey:
        return None

    sentiment_score = float(result.get("sentiment_score", 0))
    reason = result.get("reason", "")

    analysis = SurveyAnalysis(
        pulse_survey_id=survey_id,
        sentiment_score=sentiment_score,
        reason=reason,
    )

    db.add(analysis)

    final_score = pulse_survey.score + sentiment_score

    if final_score < 1:
        final_score = 1
    elif final_score > 5:
        final_score = 5

    pulse_survey.score = final_score

    db.commit()
    db.refresh(pulse_survey)

    return pulse_survey