from fastapi import APIRouter, HTTPException, status
from app.schemas.student import StudentCreate, StudentLogin
from app.database.connection import db, students_collection
from app.core.security import hash_password, verify_password

router = APIRouter(prefix="/student", tags=["Student"])

@router.post("/register")
def register_student(student: StudentCreate):
    print("RAW password:", student.password)  # DEBUG

    student_dict = student.model_dump()

    student_dict["password"] = hash_password(student.password)

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
        "student": {
            "id": str(student["_id"]),
            "email": student["email"],
            "firstName": student["firstName"],
            "lastName": student["lastName"]
        }
    }