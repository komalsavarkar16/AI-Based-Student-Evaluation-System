from pydantic import BaseModel, EmailStr

class StudentCreate(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    password: str

class StudentLogin(BaseModel):
    email: EmailStr
    password: str