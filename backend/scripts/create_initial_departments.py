import app.models.user
import app.models.department
import app.models.pulse_survey
import app.models.skill
import app.models.skill_category
import app.models.risk_alert
import app.models.ai_consultation
import app.models.intervention_note
import app.models.skill_history
import app.models.survey_analysis

from app.db.session import SessionLocal
from app.models.department import Department


INITIAL_DEPARTMENTS = [
    "営業部",
    "開発部",
    "人事部",
    "経営企画部",
    "カスタマーサクセス部",
]


def create_initial_departments():
    db = SessionLocal()

    try:
        created_count = 0

        for dept_name in INITIAL_DEPARTMENTS:
            existing = db.query(Department).filter(Department.name == dept_name).first()
            if existing:
                print(f"⚠ 既に存在: {dept_name}")
                continue

            department = Department(name=dept_name)
            db.add(department)
            created_count += 1
            print(f"✅ 作成予定: {dept_name}")

        db.commit()
        print(f"\n完了: {created_count} 件の部署を作成しました")

    except Exception as e:
        db.rollback()
        print(f"❌ 部署作成失敗: {e}")

    finally:
        db.close()


if __name__ == "__main__":
    create_initial_departments()