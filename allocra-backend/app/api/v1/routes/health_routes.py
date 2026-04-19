from fastapi import APIRouter
from sqlalchemy import text
from app.db.session import SessionLocal

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("")
def health():
    try:
        db = SessionLocal(); db.execute(text("SELECT 1")); db.close()
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {e}"
    return {"status": "ok", "db": db_status}
