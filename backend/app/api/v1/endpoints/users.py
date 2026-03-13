from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ....core.security import get_admin_user
from ....db.session import get_db
from ....models.user import User
from ....schemas.user import UserCreate, UserResponse, RoleUpdate, DepartmentUpdate, ManagerUpdate
from ....crud.crud_user import (
    create_user,
    get_all_users,
    delete_user,
    update_user_role,
    update_user_department,
    update_user_manager,
)

# HTTPエラー用
from fastapi import HTTPException, status
# サーベイ推移レスポンススキーマ
from app.schemas.pulse_survey import PulseSurveyTrendResponse
# サーベイCRUD
from app.crud import crud_pulse_survey
# Userモデル
from app.models.user import User
# DBセッション
from sqlalchemy.orm import Session
# DB取得
from app.db.session import get_db
# ログインユーザー取得
from app.api.deps import get_current_user
# FastAPI依存関係
from fastapi import Depends

router = APIRouter()


@router.post("/", response_model=UserResponse)
def create_user_api(
    user: UserCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    return create_user(db, user)


@router.get("/", response_model=list[UserResponse])
def get_users_api(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    return get_all_users(db)


@router.delete("/{user_id}")
def delete_user_api(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    delete_user(db, user_id)
    return {"message": "user deleted"}


@router.put("/{user_id}/role", response_model=UserResponse)
def update_role_api(
    user_id: int,
    data: RoleUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    return update_user_role(db, user_id, data)


@router.put("/{user_id}/department", response_model=UserResponse)
def update_department_api(
    user_id: int,
    data: DepartmentUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    return update_user_department(db, user_id, data)


@router.put("/{user_id}/manager", response_model=UserResponse)
def update_manager_api(
    user_id: int,
    data: ManagerUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    return update_user_manager(db, user_id, data)

# 指定ユーザーのサーベイ推移を取得するAPI
@router.get("/{user_id}/survey-trend", response_model=list[PulseSurveyTrendResponse])
def get_user_survey_trend(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    # 対象ユーザー取得
    target_user = db.query(User).filter(User.id == user_id).first()

    # ユーザーが存在しない場合
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="ユーザーが見つかりません"
        )

    # 管理者は全ユーザー閲覧可能
    if current_user.role == "admin":
        pass

    # チームマネージャーは自分の部下のみ閲覧可能
    elif target_user.manager_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="閲覧権限がありません"
        )

    # サーベイ推移取得
    surveys = crud_pulse_survey.get_survey_trend_by_user_id(db, user_id)

    return surveys