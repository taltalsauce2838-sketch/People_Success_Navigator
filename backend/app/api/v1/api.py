from fastapi import APIRouter
from .endpoints import surveys
from .endpoints import analytics
from .endpoints import users
from .endpoints import auth
from .endpoints import departments
from .endpoints import alerts

api_router = APIRouter()

# 各機能のルーターを登録し、タグで分類する
api_router.include_router(surveys.router, prefix="/pulse", tags=["Pulse Survey (パルスサーベイ)"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Team Status (チームステータス)"])
api_router.include_router(users.router, prefix="/users", tags=["User (ユーザー管理)"])
api_router.include_router(auth.router, prefix="/auth", tags=["Auth (認証)"])
api_router.include_router(departments.router, prefix="/departments", tags=["departments"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Risk Alerts (離職リスク)"])
