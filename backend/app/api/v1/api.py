from fastapi import APIRouter
from .endpoints import surveys
from .endpoints import analytics

api_router = APIRouter()

# 各機能のルーターを登録し、タグで分類する
api_router.include_router(surveys.router, prefix="/pulse", tags=["Pulse Survey (パルスサーベイ)"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Team Status (チームステータス)"])
