from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.orm import relationship
from app.db.base import Base

class UserDB(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    available_hours = Column(Float, nullable=False)
    skills = relationship("SkillDB", back_populates="user", cascade="all, delete-orphan")
