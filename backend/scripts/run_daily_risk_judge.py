import argparse
import asyncio
from datetime import date, datetime, timedelta

from sqlalchemy import distinct

from app.db.session import SessionLocal
from app.models.user import User
from app.services.risk_judge_service import generate_risk_alerts_for_manager


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="毎日9時実行向けの離職リスク日次判定バッチ")
    parser.add_argument("--days", type=int, default=7, help="判定対象日数（デフォルト7日）")
    parser.add_argument(
        "--target-date",
        type=str,
        default=None,
        help="判定基準日 (YYYY-MM-DD)。未指定時は前日を使用",
    )
    return parser.parse_args()


def resolve_target_date(raw: str | None) -> date:
    if raw:
        return datetime.strptime(raw, "%Y-%m-%d").date()
    return date.today() - timedelta(days=1)


async def main() -> None:
    args = parse_args()
    target_date = resolve_target_date(args.target_date)

    db = SessionLocal()
    try:
        manager_ids = [
            row[0]
            for row in db.query(distinct(User.manager_id))
            .filter(User.manager_id.isnot(None))
            .all()
            if row[0] is not None
        ]

        results = []
        for manager_id in manager_ids:
            result = await generate_risk_alerts_for_manager(
                db=db,
                manager_id=manager_id,
                days=args.days,
                end_survey_date=target_date,
                execution_type="batch",
            )
            results.append(result)
            print({
                "manager_id": manager_id,
                "generated_count": result.get("generated_count", 0),
                "survey_start_date": result.get("survey_start_date"),
                "survey_end_date": result.get("survey_end_date"),
                "execution_type": result.get("execution_type"),
            })

        generated_total = sum(result.get("generated_count", 0) for result in results)
        print({
            "run_at": datetime.now().isoformat(timespec="seconds"),
            "target_date": target_date.isoformat(),
            "days": args.days,
            "manager_count": len(manager_ids),
            "generated_total": generated_total,
            "execution_type": "batch",
        })
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
