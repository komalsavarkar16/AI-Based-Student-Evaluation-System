from pydantic import BaseModel, EmailStr

class AdminCreate(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    password: str

class AdminLogin(BaseModel):
    email: EmailStr
    password: str
