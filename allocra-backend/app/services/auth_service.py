from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user_schema import TokenOut, UserLogin, UserOut, UserSignup

def signup(payload: UserSignup, db: Session) -> TokenOut:
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")
    user = User(email=payload.email, name=payload.name, hashed_password=hash_password(payload.password))
    db.add(user); db.commit(); db.refresh(user)
    return TokenOut(access_token=create_access_token(str(user.id)), user=UserOut.model_validate(user))

def login(payload: UserLogin, db: Session) -> TokenOut:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return TokenOut(access_token=create_access_token(str(user.id)), user=UserOut.model_validate(user))
