from fastapi import APIRouter, HTTPException, status
from app.schemas.admin import AdminCreate, AdminLogin, AdminUpdate
from bson import ObjectId
from app.database.connection import db, admins_collection
from app.core.security import hash_password, verify_password
from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest
from app.services.email_service import send_reset_email
import secrets
from datetime import datetime, timedelta
from app.services.ai_service import generate_welcome_letter

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
    from app.database.connection import results_collection
    pipeline = [
        {"$group": {
            "_id": "$courseTitle",
            "avgScore": {"$avg": "$overallVideoScore"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"avgScore": -1}}
    ]
    results = list(results_collection.aggregate(pipeline))
    return [{"name": r["_id"], "score": round(r["avgScore"], 2) if r["avgScore"] else 0, "students": r["count"]} for r in results]

@router.get("/analytics/overall-status")
async def get_overall_status():
    from app.database.connection import results_collection
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    results = list(results_collection.aggregate(pipeline))
    
    # Format the data for the frontend
    status_counts = {r["_id"] if r["_id"] else "Pending": r["count"] for r in results}
    
    # Calculate passing (Approved)
    approved = status_counts.get("Approved", 0)
    
    # Calculate failing (Retry Required)
    retry = status_counts.get("Retry Required", 0)
    
    # Stuck in Bridge (Recommended or In Progress)
    bridge_rec = status_counts.get("Bridge Course Recommended", 0)
    bridge_prog = status_counts.get("Bridge Course In Progress", 0)
    # Treat READY_FOR_RETEST as a pending/ready state but count bridge students specifically
    bridge_total = bridge_rec + bridge_prog
    
    # Pending / Others
    pending = status_counts.get("Pending", 0)
    ready = status_counts.get("READY_FOR_RETEST", 0)
    others = pending + ready
    
    total = sum(status_counts.values())
    
    return {
        "approved": approved,
        "retry": retry,
        "bridge": bridge_total,
        "pending": others,
        "total": total,
        "passPercent": round((approved / total * 100), 1) if total > 0 else 0,
        "failPercent": round((retry / total * 100), 1) if total > 0 else 0
    }

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
            "mcqScore": eval.get("score", 0),
            "videoScore": round(eval.get("overallVideoScore", 0), 2) if "overallVideoScore" in eval else "Pending",
            "eligibilitySignal": eval.get("eligibilitySignal", "-"),
            "status": eval.get("status", "Pending"),
            "timestamp": eval.get("evaluatedAt") or eval.get("timestamp"),
            "historyCount": len(eval.get("evaluationHistory", []))
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
        "mcqScore": result.get("score", 0),
        "overallScore": round(result.get("overallVideoScore", 0), 2) if "overallVideoScore" in result else 0,
        "eligibilitySignal": result.get("eligibilitySignal", "-"),
        "executiveSummary": result.get("executiveSummary", ""),
        "overallReasoning": result.get("overallReasoning", ""),
        "competencyGapReport": result.get("competencyGapReport", "No data"),
        "vibeCheck": result.get("vibeCheck", "No data"),
        "aiVerdict": result.get("aiVerdict", "No data"),
        "skillGap": result.get("skillGap", []),
        "detailedSkillGap": result.get("detailedSkillGap", []),
        "videoAnswers": result.get("videoAnswers", []),
        "status": result.get("status", "Pending"),
        "decisionNotes": result.get("decisionNotes", ""),
        "timestamp": result.get("evaluatedAt") or result.get("timestamp"),
        "evaluationHistory": result.get("evaluationHistory", [])
    }
    return report

@router.post("/submit-decision/{result_id}")
async def submit_decision(result_id: str, decision_data: dict):
    if not ObjectId.is_valid(result_id):
        raise HTTPException(status_code=400, detail="Invalid Result ID")
    
    status = decision_data.get("status")
    notes = decision_data.get("notes", "")
    
    if status not in ["Approved", "Bridge Course Recommended", "Retry Required"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = db.test_results.find_one_and_update(
        {"_id": ObjectId(result_id)},
        {"$set": {
            "status": status,
            "decisionNotes": notes,
            "decidedAt": datetime.utcnow()
        }},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Test result not found")

    # --- Generate Welcome Letter if Approved ---
    if status == "Approved":
        student = db.students.find_one({"_id": result.get("studentId")})
        student_name = f"{student.get('firstName')} {student.get('lastName')}" if student else "Student"
        course_title = result.get("courseTitle", "Assessment")
        # Calculate a simple average of MCQ and Video score for the letter
        mcq_score = result.get("score", 0)
        video_score = result.get("overallVideoScore", 0) * 10 # Scale to 100
        overall_avg = (mcq_score + video_score) / 2
        
        try:
            welcome_letter = generate_welcome_letter(student_name, course_title, round(overall_avg, 1))
            db.test_results.update_one(
                {"_id": ObjectId(result_id)},
                {"$set": {"enrollmentLetter": welcome_letter}}
            )
        except Exception as e:
            print(f"Failed to generate welcome letter: {e}")
        
    # --- Create a notification for the student ---
    student_id = result.get("studentId")
    course_id = result.get("courseId")
    course_title = result.get("courseTitle", "Assessment")
    
    if student_id:
        notification_msg = f"Your evaluation for '{course_title}' has been reviewed."
        if status == "Approved":
            notification_msg = f"Congratulations! Your evaluation for '{course_title}' was Approved."
        elif status == "Bridge Course Recommended":
            notification_msg = f"A Bridge Course has been recommended for '{course_title}'."
        elif status == "Retry Required":
            notification_msg = f"You are required to retry the '{course_title}' assessment."
            
        notification = {
            "type": "admin_decision",
            "studentId": ObjectId(student_id),
            "courseId": ObjectId(course_id) if course_id else None,
            "courseTitle": course_title,
            "decision": status,
            "message": notification_msg,
            "notes": notes,
            "isRead": False,
            "timestamp": datetime.utcnow()
        }
        db.notifications.insert_one(notification)
    
    return {"message": f"Decision submitted: {status}"}

@router.get("/students")
async def get_students():
    from app.database.connection import students_collection, results_collection
    students = list(students_collection.find().sort("firstName", 1))
    
    results = []
    for student in students:
        # Get latest MCQ result
        latest_mcq = results_collection.find_one(
            {"studentId": student["_id"], "score": {"$exists": True}},
            sort=[("timestamp", -1)]
        )
        
        # Get latest Video result
        latest_video = results_collection.find_one(
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
