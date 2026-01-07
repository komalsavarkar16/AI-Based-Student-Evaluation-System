from pydantic import BaseModel
from typing import List, Optional, Dict

class CourseBase(BaseModel):
    title: str
    description: str
    category: str
    level: str
    duration: str
    skills_required: List[str]
    status: str = "Draft"

class CourseCreate(CourseBase):
    pass

class Course(CourseBase):
    id: str
    aiStatus: Dict[str, bool] = {"mcqGenerated": False, "videoQuestionsGenerated": False}
    createdBy: str = "admin"
    createdAt: str # Use datetime string
