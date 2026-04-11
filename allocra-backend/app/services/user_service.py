from sqlalchemy.orm import Session
from app.models.db.user_model import UserDB
from app.models.db.skill_model import SkillDB
from app.schemas.user_schema import UserCreateSchema
from typing import List, Optional

def create_user(db: Session, data: UserCreateSchema) -> UserDB:
    user = UserDB(name=data.name, available_hours=data.available_hours)
    db.add(user)
    db.flush()
    for skill in data.skills:
        db.add(SkillDB(user_id=user.id, skill_name=skill.skill_name, level=skill.level))
    db.commit()
    db.refresh(user)
    return user

def get_all_users(db: Session) -> List[UserDB]:
    return db.query(UserDB).all()

def get_user_by_id(db: Session, user_id: int) -> Optional[UserDB]:
    return db.query(UserDB).filter(UserDB.id == user_id).first()

def delete_user(db: Session, user_id: int) -> bool:
    user = get_user_by_id(db, user_id)
    if not user:
        return False
    db.delete(user)
    db.commit()
    return True
