from fastapi import HTTPException
from sqlalchemy.orm import Session

from core.security_admin import create_access_token, verify_password
from models.user import User


def login_user(db: Session, email: str, password: str) -> str:
    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが違います")

    if not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが違います")

    return create_access_token(
        user_id=user.id,
        email=user.email,
        role=user.role.value,
    )