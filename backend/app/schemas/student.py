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
    remember_me: Optional[bool] = False

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
    status: Optional[str] = "Pending"
    decisionNotes: Optional[str] = None
    timestamp: datetime = None

class StudentResponse(BaseModel):
    studentId: str
    courseId: str
    mcqAnswers: List[dict]
    mcqScore: float
    videoAnswers: Optional[List[dict]] = []
    videoUrls: Optional[List[dict]] = []
    submittedAt: datetime = datetime.now()

class AIEvaluation(BaseModel):
    responseId: str
    studentId: str
    courseId: str
    scores: dict
    executiveSummary: str
    skillGaps: List[str]
    vibeCheck: str
    aiVerdict: str
    evaluatedAt: datetime = datetime.now()

class AdmissionsStatus(BaseModel):
    responseId: str
    studentId: str
    status: str = "Pending"
    decisionNotes: Optional[str] = None
    enrollmentLetter: Optional[str] = None
    decidedAt: Optional[datetime] = None

class BridgeCurriculum(BaseModel):
    responseId: str
    studentId: str
    roadmap: List[dict]
    checklist: List[dict]
    isActive: bool = True
