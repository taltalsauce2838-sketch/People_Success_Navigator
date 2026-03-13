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
from app.models.user import User, UserRole
from app.core.security import hash_password


ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "Admin1234!"
ADMIN_NAME = "Initial Admin"


def create_initial_admin():
    db = SessionLocal()

    try:
        existing_user = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if existing_user:
            print("⚠ Admin user already exists")
            return

        print(f"email bytes: {len(ADMIN_EMAIL.encode('utf-8'))}")
        print(f"password bytes: {len(ADMIN_PASSWORD.encode('utf-8'))}")

        admin_user = User(
            name=ADMIN_NAME,
            email=ADMIN_EMAIL,
            hashed_password=hash_password(ADMIN_PASSWORD),
            role=UserRole.admin,
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print("✅ Initial admin created")
        print(f"email: {ADMIN_EMAIL}")
        print(f"password: {ADMIN_PASSWORD}")

    except Exception as e:
        db.rollback()
        print(f"❌ Failed to create admin: {e}")

    finally:
        db.close()


if __name__ == "__main__":
    create_initial_admin()