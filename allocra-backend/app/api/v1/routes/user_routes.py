from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user_schema import UserCreateSchema, UserResponseSchema
from app.services import user_service
from typing import List

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/", response_model=UserResponseSchema)
def create_user(data: UserCreateSchema, db: Session = Depends(get_db)):
    return user_service.create_user(db, data)

@router.get("/", response_model=List[UserResponseSchema])
def get_users(db: Session = Depends(get_db)):
    return user_service.get_all_users(db)

@router.get("/{user_id}", response_model=UserResponseSchema)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    deleted = user_service.delete_user(db, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"User {user_id} deleted"}
