from dataclasses import dataclass, field
from typing import Dict

@dataclass
class User:
    id: int
    name: str
    skills: Dict[str, int]
    available_hours: float
    current_load: float = 0.0
