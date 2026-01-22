from fastapi import APIRouter, HTTPException, status
from app.schemas.student import StudentCreate, StudentLogin
from app.database.connection import db, students_collection
from app.core.security import hash_password, verify_password
from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest
from app.services.email_service import send_reset_email
import secrets
from datetime import datetime, timedelta

router = APIRouter(prefix="/student", tags=["Student"])

@router.post("/register")
def register_student(student: StudentCreate):
    print("RAW password:", student.password)  # DEBUG

    student_dict = student.model_dump()

    student_dict["password"] = hash_password(student.password)
    student_dict["role"] = "student"

    # 🚨 REMOVE confirmPassword if it exists
    student_dict.pop("confirmPassword", None)

    db.students.insert_one(student_dict)

    return {"message": "Student registered successfully"}


@router.post("/login")
async def login_student(data: StudentLogin):
    student = students_collection.find_one({"email": data.email})

    if not student:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not verify_password(data.password, student["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    return {
        "message": "Login successful",
        "role": student["role"],
        "student": {
            "id": str(student["_id"]),
            "email": student["email"],
            "firstName": student["firstName"],
            "lastName": student["lastName"],
        }
    }


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    student = students_collection.find_one({"email": data.email})

    if not student:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = secrets.token_urlsafe(32)
    expiry = datetime.utcnow() + timedelta(hours=1)

    students_collection.update_one(
        {"_id": student["_id"]},
            {"$set": {
                "reset_token": token,
                "reset_token_expiry": expiry
            }}
        )

    await send_reset_email(data.email, token, "student")
    
    return {
        "message": "If your email is registered, you will receive a reset link shortly."
        }


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    student = students_collection.find_one({
        "reset_token": data.token,
        "reset_token_expiry": {"$gt": datetime.utcnow()}
    })

    if not student:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    hashed_password = hash_password(data.new_password)
    students_collection.update_one(
        {"_id": student["_id"]},
        {
            "$set": {"password": hashed_password},
            "$unset": {"reset_token": "", "reset_token_expiry": ""}
        }
    )

    return {"message": "Password reset successfully"}