from dataclasses import dataclass
from typing import Optional
from datetime import datetime

@dataclass
class Task:
    id: int
    title: str
    required_skill: str
    difficulty: float
    priority: int
    deadline: Optional[datetime] = None
