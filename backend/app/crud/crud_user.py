from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..core.security import hash_password
from ..models.department import Department
from ..models.user import User, UserRole
from ..schemas.user import UserCreate, RoleUpdate, DepartmentUpdate, ManagerUpdate


def create_user(db: Session, user_data: UserCreate) -> User:
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="このメールアドレスは既に登録されています")

    try:
        role_enum = UserRole(user_data.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="role は user / manager / admin のいずれかです")

    if user_data.department_id is not None:
        department = db.query(Department).filter(Department.id == user_data.department_id).first()
        if not department:
            raise HTTPException(status_code=404, detail="部署が見つかりません")

    # manager_id は None を許可
    if user_data.manager_id is not None:
        manager = db.query(User).filter(User.id == user_data.manager_id).first()
        if not manager:
            raise HTTPException(status_code=404, detail="マネージャーが見つかりません")

    new_user = User(
        name=user_data.name,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        role=role_enum,
        department_id=user_data.department_id,
        manager_id=user_data.manager_id,
        joined_at=user_data.joined_at,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def get_all_users(db: Session) -> list[User]:
    return db.query(User).all()


def delete_user(db: Session, user_id: int) -> None:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="user not found")

    subordinates = db.query(User).filter(User.manager_id == user_id).all()
    for subordinate in subordinates:
        subordinate.manager_id = None

    db.delete(user)
    db.commit()


def update_user_role(db: Session, user_id: int, data: RoleUpdate) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="user not found")

    try:
        user.role = UserRole(data.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="role は user / manager / admin のいずれかです")

    db.commit()
    db.refresh(user)
    return user


def update_user_department(db: Session, user_id: int, data: DepartmentUpdate) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="user not found")

    department = db.query(Department).filter(Department.id == data.department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="部署が見つかりません")

    user.department_id = data.department_id
    db.commit()
    db.refresh(user)
    return user


def update_user_manager(db: Session, user_id: int, data: ManagerUpdate) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="user not found")

    # manager なしを許可
    if data.manager_id is None:
        user.manager_id = None
        db.commit()
        db.refresh(user)
        return user

    # 自分自身を manager にするのは禁止
    if data.manager_id == user_id:
        raise HTTPException(status_code=400, detail="自分自身を manager に設定できません")

    # 存在しない manager は禁止
    manager = db.query(User).filter(User.id == data.manager_id).first()
    if not manager:
        raise HTTPException(status_code=404, detail="manager not found")

    user.manager_id = data.manager_id
    db.commit()
    db.refresh(user)
    return user