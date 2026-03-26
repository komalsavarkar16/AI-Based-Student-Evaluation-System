from pydantic import BaseModel, EmailStr
from typing import Optional, List

class AdminBase(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    experience: Optional[str] = None
    expertise: Optional[List[str]] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    profileImage: Optional[str] = None
    isActive: bool = True

class AdminCreate(AdminBase):
    password: str

class AdminUpdate(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    experience: Optional[str] = None
    expertise: Optional[List[str]] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    profileImage: Optional[str] = None
    isActive: Optional[bool] = None

class AdminLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: Optional[bool] = False

class SystemSettings(BaseModel):
    mcqCount: int = 10
    videoCount: int = 6
    timeLimit: int = 60
    mcqWeightage: int = 40
    videoWeightage: int = 60
    passingScore: int = 50

class AnnouncementCreate(BaseModel):
    title: str
    message: str
    targetAudience: str  # "all" or "course"
    courseId: Optional[str] = None
    expiryDate: Optional[str] = None  # ISO format string or None

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    targetAudience: Optional[str] = None
    courseId: Optional[str] = None
    expiryDate: Optional[str] = None
