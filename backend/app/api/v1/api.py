from fastapi import APIRouter
from .endpoints import surveys

api_router = APIRouter()

# 各機能のルーターを登録し、タグで分類する
api_router.include_router(surveys.router, prefix="/pulse", tags=["Pulse Survey (パルスサーベイ)"])
