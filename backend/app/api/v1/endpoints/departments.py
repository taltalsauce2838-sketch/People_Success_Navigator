from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ....db.session import get_db
from ....core.security import get_admin_user
from ....models.user import User
from ....crud import crud_department
from ....schemas.department import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
    DepartmentDeleteResponse,
)

router = APIRouter()


@router.get("/", response_model=list[DepartmentResponse])
def list_departments(
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    return crud_department.get_all_departments(db)


@router.get("/{department_id}", response_model=DepartmentResponse)
def get_department(
    department_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    department = crud_department.get_department_by_id(db, department_id)

    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="部署が見つかりません"
        )

    return department


@router.post("/", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    obj_in: DepartmentCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    existing = crud_department.get_department_by_name(db, obj_in.name)

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="同名の部署が既に存在します"
        )

    return crud_department.create_department(db, obj_in.name)


@router.put("/{department_id}", response_model=DepartmentResponse)
def update_department(
    department_id: int,
    obj_in: DepartmentUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    department = crud_department.get_department_by_id(db, department_id)

    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="部署が見つかりません"
        )

    same_name_department = crud_department.get_department_by_name(db, obj_in.name)
    if same_name_department and same_name_department.id != department_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="同名の部署が既に存在します"
        )

    return crud_department.update_department(db, department, obj_in.name)


@router.delete("/{department_id}", response_model=DepartmentDeleteResponse)
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    department = crud_department.get_department_by_id(db, department_id)

    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="部署が見つかりません"
        )

    # users.py の作りからすると、User は department_id を持っているため、
    # 紐づくユーザーが残っている部署は削除不可にしておく方が安全
    if department.users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="所属ユーザーが存在するため、この部署は削除できません"
        )

    deleted_name = department.name
    crud_department.delete_department(db, department)

    return DepartmentDeleteResponse(
        message="部署を削除しました",
        deleted_department_id=department_id,
        deleted_department_name=deleted_name,
    )