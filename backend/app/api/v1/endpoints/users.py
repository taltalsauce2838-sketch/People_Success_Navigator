from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ....core.security import get_admin_user, get_current_user
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

@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_user),
):
    """
    ログイン中ユーザーの情報取得
    """
    return current_user