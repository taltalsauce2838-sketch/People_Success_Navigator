from sqlalchemy.orm import Session

from ..models.department import Department


def get_all_departments(db: Session) -> list[Department]:
    return db.query(Department).order_by(Department.id.asc()).all()


def get_department_by_id(db: Session, department_id: int) -> Department | None:
    return (
        db.query(Department)
        .filter(Department.id == department_id)
        .first()
    )


def get_department_by_name(db: Session, name: str) -> Department | None:
    return (
        db.query(Department)
        .filter(Department.name == name)
        .first()
    )


def create_department(db: Session, name: str) -> Department:
    db_obj = Department(name=name)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_department(db: Session, department: Department, new_name: str) -> Department:
    department.name = new_name
    db.commit()
    db.refresh(department)
    return department


def delete_department(db: Session, department: Department) -> Department:
    db.delete(department)
    db.commit()
    return department