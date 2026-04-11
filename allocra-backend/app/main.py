from fastapi import FastAPI
from app.api.v1.api import router
from app.db.init_db import init_db

app = FastAPI(
    title="Allocra",
    description="Algorithmic task allocation engine",
    version="1.0.0"
)

app.include_router(router)

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/")
def health():
    return {"status": "Allocra running"}
