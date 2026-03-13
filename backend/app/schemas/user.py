from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str
    department_id: Optional[int] = None
    manager_id: Optional[int] = None
    joined_at: Optional[date] = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    department_id: Optional[int] = None
    manager_id: Optional[int] = None
    joined_at: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)


class RoleUpdate(BaseModel):
    role: str


class DepartmentUpdate(BaseModel):
    department_id: int


class ManagerUpdate(BaseModel):
    manager_id: Optional[int] = None