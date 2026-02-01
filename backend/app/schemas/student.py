from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime

class StudentCreate(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    password: str

class StudentLogin(BaseModel):
    email: EmailStr
    password: str

class StudentProfile(BaseModel):
    id: str
    firstName: str
    lastName: str
    email: EmailStr
    phone: Optional[str] = None
    university: Optional[str] = None
    major: Optional[str] = None
    year: Optional[str] = None
    gpa: Optional[str] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    dob: Optional[str] = None
    profileImage: Optional[str] = None
    skills: Optional[List[str]] = []

class StudentProfileUpdate(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    phone: Optional[str] = None
    university: Optional[str] = None
    major: Optional[str] = None
    year: Optional[str] = None
    gpa: Optional[str] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    dob: Optional[str] = None
    profileImage: Optional[str] = None
    skills: Optional[List[str]] = None

class TestResult(BaseModel):
    studentId: str
    courseId: str
    courseTitle: str = "Assessment"
    score: float
    totalQuestions: int
    correctAnswers: int
    answers: List[dict]
    timestamp: datetime = None
