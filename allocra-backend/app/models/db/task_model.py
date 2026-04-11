from sqlalchemy import Column, Integer, String, Float, DateTime
from app.db.base import Base

class TaskDB(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    required_skill = Column(String, nullable=False)
    difficulty = Column(Float, nullable=False)
    priority = Column(Integer, nullable=False)
    deadline = Column(DateTime, nullable=True)
