from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class DepartmentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class DepartmentResponse(BaseModel):
    id: int
    name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DepartmentDeleteResponse(BaseModel):
    message: str
    deleted_department_id: int
    deleted_department_name: str