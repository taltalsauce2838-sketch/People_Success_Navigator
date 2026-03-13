from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db import get_db
from schemas.auth_admin import LoginRequest, TokenResponse
from services.auth_admin import login_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login_api(data: LoginRequest, db: Session = Depends(get_db)):
    token = login_user(db, data.email, data.password)
    return {
        "access_token": token,
        "token_type": "bearer"
    }