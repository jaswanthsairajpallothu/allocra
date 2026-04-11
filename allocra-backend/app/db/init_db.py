from app.db.base import Base
from app.db.session import engine
from app.models.db.user_model import UserDB
from app.models.db.skill_model import SkillDB
from app.models.db.task_model import TaskDB

def init_db():
    Base.metadata.create_all(bind=engine)
