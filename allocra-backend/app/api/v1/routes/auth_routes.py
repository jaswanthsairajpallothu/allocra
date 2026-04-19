from fastapi import APIRouter
from app.core.dependencies import CurrentUser, DBSession
from app.schemas.user_schema import TokenOut, UserLogin, UserOut, UserSignup
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/signup", response_model=TokenOut, status_code=201)
def signup(payload: UserSignup, db: DBSession):
    return auth_service.signup(payload, db)

@router.post("/login", response_model=TokenOut)
def login(payload: UserLogin, db: DBSession):
    return auth_service.login(payload, db)

@router.get("/me", response_model=UserOut)
def me(current_user: CurrentUser):
    return current_user
