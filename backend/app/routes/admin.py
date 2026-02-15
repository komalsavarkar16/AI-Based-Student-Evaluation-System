from fastapi import APIRouter, HTTPException, status
from app.schemas.admin import AdminCreate, AdminLogin, AdminUpdate
from bson import ObjectId
from app.database.connection import db, admins_collection
from app.core.security import hash_password, verify_password
from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest
from app.services.email_service import send_reset_email
import secrets
from datetime import datetime, timedelta

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.post("/register")
def register_admin(admin: AdminCreate):
    # Check if admin already exists
    if admins_collection.find_one({"email": admin.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    admin_dict = admin.model_dump()

    admin_dict["password"] = hash_password(admin.password)
    admin_dict["role"] = "admin"

    # 🚨 REMOVE confirmPassword if it exists
    admin_dict.pop("confirmPassword", None)

    admins_collection.insert_one(admin_dict)

    return {"message": "Admin registered successfully"}


@router.post("/login")
async def login_admin(data: AdminLogin):
    admin = admins_collection.find_one({"email": data.email})

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not verify_password(data.password, admin["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    from app.core.security import create_access_token
    access_token = create_access_token(data={"sub": str(admin["_id"]), "role": admin["role"]})

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "admin": {
            "id": str(admin["_id"]),
            "email": admin["email"],
            "firstName": admin["firstName"],
            "lastName": admin["lastName"],
        },
        "role": admin["role"]
    }

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    admin = admins_collection.find_one({"email": data.email})

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = secrets.token_urlsafe(32)
    expiry = datetime.utcnow() + timedelta(hours=1)

    admins_collection.update_one(
        {"_id": admin["_id"]},
            {"$set": {
                "reset_token": token,
                "reset_token_expiry": expiry
            }}
        )

    await send_reset_email(data.email, token, "admin")
    
    return {
        "message": "If your email is registered, you will receive a reset link shortly."
        }


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    admin = admins_collection.find_one({
        "reset_token": data.token,
        "reset_token_expiry": {"$gt": datetime.utcnow()}
    })

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    hashed_password = hash_password(data.new_password)
    admins_collection.update_one(
        {"_id": admin["_id"]},
        {
            "$set": {"password": hashed_password},
            "$unset": {"reset_token": "", "reset_token_expiry": ""}
        }
    )

    return {"message": "Password reset successfully"}

@router.get("/profile/{admin_id}")
async def get_admin_profile(admin_id: str):
    if not ObjectId.is_valid(admin_id):
        raise HTTPException(status_code=400, detail="Invalid admin ID")
    
    admin = admins_collection.find_one({"_id": ObjectId(admin_id)})
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    # Convert ObjectId to string and remove password
    admin["id"] = str(admin["_id"])
    del admin["_id"]
    if "password" in admin:
        del admin["password"]
    
    return admin

@router.put("/profile/{admin_id}")
async def update_admin_profile(admin_id: str, admin_update: AdminUpdate):
    if not ObjectId.is_valid(admin_id):
        raise HTTPException(status_code=400, detail="Invalid admin ID")
    
    update_data = {k: v for k, v in admin_update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = admins_collection.update_one(
        {"_id": ObjectId(admin_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    return {"message": "Profile updated successfully"}

@router.get("/notifications")
async def get_notifications():
    notifications = list(db.notifications.find().sort("timestamp", -1).limit(20))
    for n in notifications:
        n["_id"] = str(n["_id"])
        if "studentId" in n: n["studentId"] = str(n["studentId"])
        if "courseId" in n: n["courseId"] = str(n["courseId"])
    return notifications

@router.get("/analytics/skill-gaps")
async def get_skill_gap_analytics():
    # Aggregate skill gaps from all test results
    pipeline = [
        {"$unwind": "$skillGap"},
        {"$group": {"_id": "$skillGap", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    results = list(db.test_results.aggregate(pipeline))
    return [{"skill": r["_id"], "value": r["count"]} for r in results]

@router.get("/analytics/course-performance")
async def get_course_performance():
    pipeline = [
        {"$group": {
            "_id": "$courseTitle",
            "avgScore": {"$sum": {"$ifNull": ["$overallVideoScore", 0]}}, # This is a simplification
            "count": {"$sum": 1}
        }}
    ]
    # More accurate average
    pipeline = [
        {"$group": {
            "_id": "$courseTitle",
            "avgScore": {"$avg": "$overallVideoScore"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"avgScore": -1}}
    ]
    results = list(db.test_results.aggregate(pipeline))
    return [{"name": r["_id"], "score": round(r["avgScore"], 2) if r["avgScore"] else 0} for r in results]

@router.get("/all-evaluations")
async def get_all_evaluations():
    # Fetch all results that have video evaluations
    evaluations = list(db.test_results.find(
        {"videoAnswers": {"$exists": True}}
    ).sort("timestamp", -1))
    
    results = []
    for eval in evaluations:
        student = db.students.find_one({"_id": eval["studentId"]})
        results.append({
            "id": str(eval["_id"]),
            "studentName": f"{student.get('firstName')} {student.get('lastName')}" if student else "Unknown",
            "courseTitle": eval.get("courseTitle"),
            "score": round(eval.get("overallVideoScore", 0), 2) if "overallVideoScore" in eval else "Pending",
            "skillGap": eval.get("skillGap", []),
            "timestamp": eval.get("evaluatedAt") or eval.get("timestamp")
        })
    return results

@router.get("/evaluation-report/{result_id}")
async def get_evaluation_report(result_id: str):
    if not ObjectId.is_valid(result_id):
        raise HTTPException(status_code=400, detail="Invalid Result ID")
    
    result = db.test_results.find_one({"_id": ObjectId(result_id)})
    if not result:
        raise HTTPException(status_code=404, detail="Evaluation report not found")
        
    student = db.students.find_one({"_id": result["studentId"]})
    
    report = {
        "id": str(result["_id"]),
        "student": {
            "name": f"{student.get('firstName')} {student.get('lastName')}" if student else "Unknown",
            "email": student.get("email") if student else "N/A"
        },
        "courseTitle": result.get("courseTitle"),
        "overallScore": round(result.get("overallVideoScore", 0), 2) if "overallVideoScore" in result else 0,
        "skillGap": result.get("skillGap", []),
        "videoAnswers": result.get("videoAnswers", []),
        "timestamp": result.get("evaluatedAt") or result.get("timestamp")
    }
    return report

@router.get("/students")
async def get_students():
    students = list(db.students.find().sort("firstName", 1))
    
    results = []
    for student in students:
        # Get latest MCQ result
        latest_mcq = db.test_results.find_one(
            {"studentId": student["_id"], "score": {"$exists": True}},
            sort=[("timestamp", -1)]
        )
        
        # Get latest Video result
        latest_video = db.test_results.find_one(
            {"studentId": student["_id"], "overallVideoScore": {"$exists": True}},
            sort=[("timestamp", -1)]
        )
        
        results.append({
            "id": str(student["_id"]),
            "name": f"{student.get('firstName')} {student.get('lastName')}",
            "email": student.get("email"),
            "mcqScore": latest_mcq.get("score") if latest_mcq else "N/A",
            "videoScore": round(latest_video.get("overallVideoScore"), 2) if latest_video else "N/A",
            "status": "Active" # Or any logic for status
        })
        
    return results
