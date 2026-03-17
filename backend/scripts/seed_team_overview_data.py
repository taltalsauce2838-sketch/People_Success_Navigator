from app.db.session import SessionLocal
from app.models.department import Department
from app.models.user import User, UserRole
from app.models.pulse_survey import PulseSurvey
from app.models.survey_analysis import SurveyAnalysis
from app.core.security import hash_password
from datetime import date, timedelta
from sqlalchemy.orm import Session

# mapper 登録のために追加
from app.models.skill import Skill
from app.models.skill_history import SkillHistory
from app.models.risk_alert import RiskAlert
from app.models.ai_consultation import AIConsultation
from app.models.skill_category import SkillCategory


DEFAULT_PASSWORD = "Password123!"


def get_or_create_department(db: Session, name: str) -> Department:
    department = db.query(Department).filter(Department.name == name).first()
    if department:
        return department

    department = Department(name=name)
    db.add(department)
    db.commit()
    db.refresh(department)
    print(f"[CREATE] Department: {name}")
    return department


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_or_create_user(
    db: Session,
    *,
    name: str,
    email: str,
    role: UserRole,
    department_id: int | None,
    manager_id: int | None,
    joined_at: date,
) -> User:
    existing = get_user_by_email(db, email)
    if existing:
        print(f"[SKIP] User exists: {email}")
        return existing

    user = User(
        name=name,
        email=email,
        hashed_password=hash_password(DEFAULT_PASSWORD),
        role=role,
        department_id=department_id,
        manager_id=manager_id,
        joined_at=joined_at,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"[CREATE] User: {name} ({email})")
    return user


def get_pulse_by_user_and_date(db: Session, user_id: int, survey_date: date) -> PulseSurvey | None:
    return (
        db.query(PulseSurvey)
        .filter(
            PulseSurvey.user_id == user_id,
            PulseSurvey.survey_date == survey_date,
        )
        .first()
    )


def create_pulse_with_analysis(
    db: Session,
    *,
    user_id: int,
    survey_date: date,
    score: int,
    memo: str,
    sentiment_score: float,
    reason: str,
) -> None:
    existing_pulse = get_pulse_by_user_and_date(db, user_id, survey_date)
    if existing_pulse:
        print(f"[SKIP] Pulse exists: user_id={user_id}, date={survey_date}")
        return

    pulse = PulseSurvey(
        user_id=user_id,
        score=score,
        memo=memo,
        survey_date=survey_date,
    )
    db.add(pulse)
    db.commit()
    db.refresh(pulse)

    analysis = SurveyAnalysis(
        pulse_survey_id=pulse.id,
        sentiment_score=sentiment_score,
        reason=reason,
    )
    db.add(analysis)
    db.commit()

    print(f"[CREATE] Pulse + Analysis: user_id={user_id}, date={survey_date}, score={score}")


def score_to_sentiment(score: int) -> float:
    mapping = {
        5: 0.8,
        4: 0.4,
        3: 0.0,
        2: -0.5,
        1: -0.8,
    }
    return mapping.get(score, 0.0)


def score_to_reason(score: int) -> str:
    if score >= 4:
        return "前向きなコメント傾向"
    if score == 3:
        return "大きな懸念はないが負荷感あり"
    return "不安・疲労感が見られる"


def build_dates(days: int = 14) -> list[date]:
    today = date.today()
    # 今日を含む直近14日
    return [today - timedelta(days=(days - 1 - i)) for i in range(days)]


def pattern_stable_high() -> list[int]:
    return [5, 4, 5, 4, 5, 4, 5, 5, 4, 5, 4, 5, 5, 4]


def pattern_stable_mid() -> list[int]:
    return [3, 4, 3, 4, 3, 3, 4, 3, 4, 3, 4, 3, 3, 4]


def pattern_low_risk() -> list[int]:
    return [2, 2, 3, 2, 2, 2, 3, 2, 2, 2, 2, 3, 2, 2]


def pattern_sharp_drop() -> list[int]:
    return [5, 5, 4, 5, 4, 5, 4, 3, 3, 2, 2, 2, 3, 2]


def pattern_missing() -> list[int | None]:
    return [4, 4, None, 4, 3, None, 3, 4, None, 3, 3, None, 4, 3]


def seed_user_pulse_data(
    db: Session,
    *,
    user: User,
    scores: list[int | None],
    memo_prefix: str,
    dates: list[date],
) -> None:
    for survey_date, score in zip(dates, scores):
        if score is None:
            print(f"[SKIP] Missing pulse intentionally: user_id={user.id}, date={survey_date}")
            continue

        memo = f"{memo_prefix}（{survey_date.isoformat()}）"
        sentiment_score = score_to_sentiment(score)
        reason = score_to_reason(score)

        create_pulse_with_analysis(
            db,
            user_id=user.id,
            survey_date=survey_date,
            score=score,
            memo=memo,
            sentiment_score=sentiment_score,
            reason=reason,
        )


def main() -> None:
    db = SessionLocal()

    try:
        # Departments
        admin_dept = get_or_create_department(db, "管理部門")
        dev1_dept = get_or_create_department(db, "開発1部")
        dev2_dept = get_or_create_department(db, "開発2部")

        # Users
        admin = get_or_create_user(
            db,
            name="管理者 太郎",
            email="admin@example.com",
            role=UserRole.admin,
            department_id=admin_dept.id,
            manager_id=None,
            joined_at=date(2025, 4, 1),
        )

        manager_a = get_or_create_user(
            db,
            name="田中 課長",
            email="manager.a@example.com",
            role=UserRole.manager,
            department_id=dev1_dept.id,
            manager_id=None,
            joined_at=date(2025, 4, 1),
        )

        manager_b = get_or_create_user(
            db,
            name="佐藤 課長",
            email="manager.b@example.com",
            role=UserRole.manager,
            department_id=dev2_dept.id,
            manager_id=None,
            joined_at=date(2025, 4, 1),
        )

        users_a = [
            get_or_create_user(
                db,
                name="山田 健太",
                email="a1@example.com",
                role=UserRole.user,
                department_id=dev1_dept.id,
                manager_id=manager_a.id,
                joined_at=date(2026, 1, 6),
            ),
            get_or_create_user(
                db,
                name="鈴木 花子",
                email="a2@example.com",
                role=UserRole.user,
                department_id=dev1_dept.id,
                manager_id=manager_a.id,
                joined_at=date(2026, 1, 10),
            ),
            get_or_create_user(
                db,
                name="高橋 翼",
                email="a3@example.com",
                role=UserRole.user,
                department_id=dev1_dept.id,
                manager_id=manager_a.id,
                joined_at=date(2026, 1, 15),
            ),
            get_or_create_user(
                db,
                name="伊藤 美咲",
                email="a4@example.com",
                role=UserRole.user,
                department_id=dev1_dept.id,
                manager_id=manager_a.id,
                joined_at=date(2026, 1, 20),
            ),
            get_or_create_user(
                db,
                name="渡辺 恒一",
                email="a5@example.com",
                role=UserRole.user,
                department_id=dev1_dept.id,
                manager_id=manager_a.id,
                joined_at=date(2026, 1, 25),
            ),
        ]

        users_b = [
            get_or_create_user(
                db,
                name="小林 葵",
                email="b1@example.com",
                role=UserRole.user,
                department_id=dev2_dept.id,
                manager_id=manager_b.id,
                joined_at=date(2026, 1, 6),
            ),
            get_or_create_user(
                db,
                name="加藤 優",
                email="b2@example.com",
                role=UserRole.user,
                department_id=dev2_dept.id,
                manager_id=manager_b.id,
                joined_at=date(2026, 1, 10),
            ),
            get_or_create_user(
                db,
                name="吉田 直樹",
                email="b3@example.com",
                role=UserRole.user,
                department_id=dev2_dept.id,
                manager_id=manager_b.id,
                joined_at=date(2026, 1, 15),
            ),
            get_or_create_user(
                db,
                name="山本 愛",
                email="b4@example.com",
                role=UserRole.user,
                department_id=dev2_dept.id,
                manager_id=manager_b.id,
                joined_at=date(2026, 1, 20),
            ),
            get_or_create_user(
                db,
                name="中村 陸",
                email="b5@example.com",
                role=UserRole.user,
                department_id=dev2_dept.id,
                manager_id=manager_b.id,
                joined_at=date(2026, 1, 25),
            ),
        ]

        # Dates
        dates = build_dates(14)

        # Patterns per manager team
        patterns = [
            (pattern_stable_high(), "業務は順調で前向きに取り組めています"),
            (pattern_stable_mid(), "やや疲れはありますが、概ね問題ありません"),
            (pattern_low_risk(), "少し不安感が続いています"),
            (pattern_sharp_drop(), "今週に入り負荷が高くなってきました"),
            (pattern_missing(), "未回答ありパターンのサンプルです"),
        ]

        for user, (scores, memo_prefix) in zip(users_a, patterns):
            seed_user_pulse_data(
                db,
                user=user,
                scores=scores,
                memo_prefix=memo_prefix,
                dates=dates,
            )

        for user, (scores, memo_prefix) in zip(users_b, patterns):
            seed_user_pulse_data(
                db,
                user=user,
                scores=scores,
                memo_prefix=memo_prefix,
                dates=dates,
            )

        print("=== Seed completed successfully ===")
        print(f"Default password for seeded users: {DEFAULT_PASSWORD}")

    finally:
        db.close()


if __name__ == "__main__":
    main()