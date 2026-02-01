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
