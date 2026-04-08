from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from app.schemas.admin import AdminCreate, AdminLogin, AdminUpdate, SystemSettings, AnnouncementCreate, AnnouncementUpdate
from bson import ObjectId
from app.database.connection import db, admins_collection, students_collection, responses_collection, ai_evaluations_collection, admissions_status_collection, bridge_curriculum_collection, courses_collection, settings_collection, announcements_collection, notifications_collection
from app.core.security import hash_password, verify_password, create_access_token
from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest
from app.services.email_service import send_reset_email
import secrets
from datetime import datetime, timedelta
from app.services.ai_service import generate_confirmation_letter
from app.core.dependencies import get_current_user
import re

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/notifications")
async def get_admin_notifications(current_user: dict = Depends(get_current_user)):
    """Retrieve the 30 most recent notifications for administrators."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    try:
        notifications = list(notifications_collection.find({
            "type": "video_test_evaluation"
        }).sort("timestamp", -1).limit(30))
        for n in notifications:
            n["_id"] = str(n["_id"])
            if "studentId" in n: n["studentId"] = str(n["studentId"])
            if "courseId" in n: n["courseId"] = str(n["courseId"])
            # Ensure isRead exists for the frontend logic
            if "isRead" not in n: n["isRead"] = n.get("status") == "read"
        return notifications
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/notifications/read-all")
async def mark_all_admin_notifications_read(current_user: dict = Depends(get_current_user)):
    """Clear all unread admin notifications."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
        
    notifications_collection.update_many(
        {"type": "video_test_evaluation", "status": "unread"},
        {"$set": {"status": "read", "isRead": True}}
    )
    return {"message": "All notifications marked as read"}

@router.put("/notifications/{notification_id}/read")
async def mark_admin_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a specific admin notification as read."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
        
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    notifications_collection.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"status": "read", "isRead": True}}
    )
    return {"message": "Notification marked as read"}


@router.post("/register")
def register_admin(admin: AdminCreate):
    # Check if admin already exists
    if admins_collection.find_one({"email": admin.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    admin_dict = admin.model_dump()

    admin_dict["password"] = hash_password(admin.password)
    admin_dict["role"] = "admin"

    admins_collection.insert_one(admin_dict)

    return {"message": "Admin registered successfully"}


@router.post("/login")
async def login_admin(data: AdminLogin):
    admin = admins_collection.find_one({"email": data.email})

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found!"
        )

    if not verify_password(data.password, admin["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    remember_me = data.remember_me
    if remember_me:
        # 7 days
        expiry_time = timedelta(days=7)
        max_age = 604800
    else:
        # 1 hour
        expiry_time = timedelta(hours=1)
        max_age = 3600

    # Create the token
    access_token = create_access_token(
        data={"sub": str(admin["_id"]), "role": admin["role"]},
        expires_delta=expiry_time
    )

    # Prepare response data (Include access_token for header-based auth)
    content = {
        "message": "Successfully signed in.",
        "access_token": access_token,
        "admin": {
            "id": str(admin["_id"]),
            "email": admin["email"],
            "firstName": admin["firstName"],
            "lastName": admin["lastName"],
        },
        "role": admin["role"]
    }

    from fastapi.responses import JSONResponse
    response = JSONResponse(content=content)
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=max_age,
        samesite="none",
        secure=True,
        path="/",
    )

    return response

@router.post("/logout")
async def logout_admin():
    from fastapi.responses import JSONResponse
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie("access_token")
    return response

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    admin = admins_collection.find_one({"email": data.email})
    
    if not admin:
        raise HTTPException(status_code=404, detail="User not found")

    # generate secure token
    token = secrets.token_urlsafe(32)

    # store token with expiry (15 mins)
    expiry = datetime.utcnow() + timedelta(minutes=15)

    admins_collection.update_one(
        {"email": data.email},
        {"$set": {"reset_token": token, "token_expiry": expiry}}
    )

    # send email (link with token)
    background_tasks.add_task(send_reset_email, data.email, token, "admin")

    return {"message": "Password reset link sent"}

@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    admin = admins_collection.find_one({"reset_token": data.token})

    if not admin:
        raise HTTPException(status_code=400, detail="Invalid token")

    # check expiry
    if admin.get("token_expiry") < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token expired")

    # hash password
    hashed_password = hash_password(data.new_password)

    # update password & remove token
    admins_collection.update_one(
        {"_id": admin["_id"]},
        {"$set": {"password": hashed_password},
         "$unset": {"reset_token": "", "token_expiry": ""}}
    )

    return {"message": "Password reset successful"}

@router.get("/profile/{admin_id}")
async def get_admin_profile(admin_id: str, current_user: dict = Depends(get_current_user)):
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
async def update_admin_profile(admin_id: str, admin_update: AdminUpdate, current_user: dict = Depends(get_current_user)):
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


@router.get("/analytics/skill-gaps")
async def get_skill_gap_analytics(current_user: dict = Depends(get_current_user)):
    # Use Normalized Data only
    pipeline_norm = [
        {"$unwind": "$skillGaps"},
        {"$group": {"_id": "$skillGaps", "count": {"$sum": 1}}}
    ]
    norm_results = list(ai_evaluations_collection.aggregate(pipeline_norm))
    
    sorted_results = sorted(norm_results, key=lambda x: x["count"], reverse=True)[:5]
    return [{"skill": r["_id"], "value": r["count"]} for r in sorted_results]
    

@router.get("/analytics/course-performance")
async def get_course_performance(current_user: dict = Depends(get_current_user)):
    # 1. Fetch all published courses
    all_courses = list(courses_collection.find({"status": "published"}))
    
    performance_data = []
    
    for course in all_courses:
        cid = course["_id"]
        
        # 2. Get students who have submitted ANY response (MCQ)
        student_count = responses_collection.count_documents({"courseId": cid})
        
        # 3. Calculate Average MCQ Score
        mcq_avg = 0
        mcq_responses = list(responses_collection.find({"courseId": cid}, {"mcqScore": 1}))
        if mcq_responses:
            mcq_avg = sum(r.get("mcqScore", 0) for r in mcq_responses) / len(mcq_responses)
            
        # 4. Calculate Average AI Video Score (from evals)
        ai_avg = 0
        ai_evals = list(ai_evaluations_collection.find({"courseId": cid}, {"scores.overallVideo": 1}))
        if ai_evals:
            ai_avg = sum(e.get("scores", {}).get("overallVideo", 0) for e in ai_evals) / len(ai_evals)
            
        performance_data.append({
            "name": course["title"],
            "students": student_count,
            "score": round(ai_avg, 2),
            "mcqScore": round(mcq_avg, 2)
        })
        
    return performance_data
    

@router.get("/dashboard-summary")
async def get_dashboard_summary(current_user: dict = Depends(get_current_user)):
    """Retrieve high-level statistics for the dashboard in a single optimized call."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    
    total_students = students_collection.count_documents({})
    total_courses = courses_collection.count_documents({})
    
    # Use aggregation for pass rate and bridge counts to avoid fetching records
    status_pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    status_results = {r["_id"]: r["count"] for r in admissions_status_collection.aggregate(status_pipeline)}
    
    approved = status_results.get("Approved", 0)
    bridge = status_results.get("Bridge Course Recommended", 0) + status_results.get("Bridge Course In Progress", 0)
    total_decided = sum(status_results.values())
    
    pass_rate = round((approved / total_decided * 100), 1) if total_decided > 0 else 0
    
    return {
        "totalStudents": total_students,
        "availableCourses": total_courses,
        "passRate": pass_rate,
        "bridgeStudents": bridge
    }


@router.get("/analytics/overall-status")
async def get_overall_status(current_user: dict = Depends(get_current_user)):
    # Aggregate from normalized admissions_status
    pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    results = {r["_id"] or "Pending": r["count"] for r in admissions_status_collection.aggregate(pipeline)}
    
    approved = results.get("Approved", 0)
    retry = results.get("Retry Required", 0)
    bridge_total = results.get("Bridge Course Recommended", 0) + results.get("Bridge Course In Progress", 0)
    pending = results.get("Pending", 0)
    ready = results.get("READY_FOR_RETEST", 0)
    
    total = sum(results.values())
    
    return {
        "approved": approved,
        "retry": retry,
        "bridge": bridge_total,
        "readyForRetest": ready,
        "pending": pending,
        "total": total,
        "passPercent": round((approved / total * 100), 1) if total > 0 else 0,
        "failPercent": round((retry / total * 100), 1) if total > 0 else 0
    }
    

@router.get("/evaluations/recent")
async def get_recent_evaluations(current_user: dict = Depends(get_current_user)):
    """Fetch only the 5 most recent completed evaluations for the dashboard widget."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    
    pipeline = [
        {"$sort": {"submittedAt": -1}},
        {"$limit": 15}, # Check the last 15 to find at least 5 completed ones
        {
            "$lookup": {
                "from": "ai_evaluations",
                "localField": "_id",
                "foreignField": "responseId",
                "as": "ai_eval"
            }
        },
        {
            "$lookup": {
                "from": "admissions_status",
                "localField": "_id",
                "foreignField": "responseId",
                "as": "admission"
            }
        },
        {"$unwind": {"path": "$ai_eval", "preserveNullAndEmptyArrays": True}},
        {"$unwind": {"path": "$admission", "preserveNullAndEmptyArrays": True}}
    ]
    
    attempts = list(responses_collection.aggregate(pipeline))
    results = []
    
    for item in attempts:
        # Prioritize completed evaluations
        v_score = item.get("ai_eval", {}).get("scores", {}).get("overallVideo")
        if v_score is None:
            continue
            
        sid = item.get("studentId")
        st = students_collection.find_one({"_id": sid})
        cid = item.get("courseId")
        co = courses_collection.find_one({"_id": cid})
        
        results.append({
            "id": str(item["_id"]),
            "studentName": f"{st.get('firstName', '')} {st.get('lastName', '')}" if st else "Unknown",
            "courseTitle": co.get('title') if co else "Assessment",
            "mcqScore": item.get("mcqScore", 0),
            "videoScore": round(v_score, 1),
            "status": item.get("admission", {}).get("status", "Pending") if item.get("admission") else "Pending",
            "timestamp": item.get("submittedAt").isoformat() if item.get("submittedAt") else None
        })
        
        if len(results) >= 5:
            break
            
    return results


@router.get("/all-evaluations")
async def get_all_evaluations(current_user: dict = Depends(get_current_user)):
    # Normalized Aggregation
    pipeline = [
        {"$sort": {"submittedAt": -1}},
        {
            "$lookup": {
                "from": "ai_evaluations",
                "localField": "_id",
                "foreignField": "responseId",
                "as": "ai_eval"
            }
        },
        {
            "$lookup": {
                "from": "admissions_status",
                "localField": "_id",
                "foreignField": "responseId",
                "as": "admission"
            }
        },
        {
            "$lookup": {
                "from": "students",
                "localField": "studentId",
                "foreignField": "_id",
                "as": "student"
            }
        },
        {"$unwind": {"path": "$student", "preserveNullAndEmptyArrays": True}},
        {"$unwind": {"path": "$ai_eval", "preserveNullAndEmptyArrays": True}},
        {"$unwind": {"path": "$admission", "preserveNullAndEmptyArrays": True}}
    ]
    
    normalized_data = list(responses_collection.aggregate(pipeline))
    results = []
    
    course_titles = {}
    for item in normalized_data:
        cid = item.get("courseId")
        if str(cid) not in course_titles:
            course = courses_collection.find_one({"_id": cid})
            course_titles[str(cid)] = course.get("title") if course else "Unknown Assessment"
            
        results.append({
            "id": str(item["_id"]),
            "studentName": f"{item['student'].get('firstName', '')} {item['student'].get('lastName', '')}" if item.get('student') else "Unknown",
            "courseTitle": course_titles[str(cid)],
            "mcqScore": round(item.get("mcqScore", 0), 2),
            "videoScore": round(item.get("ai_eval", {}).get("scores", {}).get("overallVideo", 0), 2) if item.get("ai_eval") else "Pending",
            "eligibilitySignal": item.get("ai_eval", {}).get("eligibilitySignal", "-"),
            "status": item.get("admission", {}).get("status", "Pending"),
            "skillGap": item.get("ai_eval", {}).get("skillGaps", []),
            "timestamp": item.get("submittedAt"),
            "historyCount": 0 
        })
            
    return results
    

@router.get("/evaluation-report/{response_id}")
async def get_evaluation_report(response_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(response_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    # Normalized Data 
    response = responses_collection.find_one({"_id": ObjectId(response_id)})
    if not response:
        raise HTTPException(status_code=404, detail="Evaluation report not found")

    ai_eval = ai_evaluations_collection.find_one({"responseId": response["_id"]}) or {}
    admission = admissions_status_collection.find_one({"responseId": response["_id"]}) or {}
    student = students_collection.find_one({"_id": response["studentId"]})
    course = courses_collection.find_one({"_id": response["courseId"]})
    
    return {
        "id": str(response["_id"]),
        "student": {
            "name": f"{student.get('firstName', '')} {student.get('lastName', '')}" if student else "Unknown",
            "email": student.get("email") if student else "N/A"
        },
        "courseTitle": course.get("title", "Assessment") if course else "Assessment",
        "mcqScore": response.get("mcqScore", 0),
        "overallScore": round(ai_eval.get("scores", {}).get("overallVideo", 0), 2) if ai_eval else 0,
        "eligibilitySignal": ai_eval.get("eligibilitySignal", "-"),
        "executiveSummary": ai_eval.get("executiveSummary", ""),
        "overallReasoning": ai_eval.get("overallReasoning", ""),
        "competencyGapReport": ai_eval.get("competencyGapReport", "No data"),
        "vibeCheck": ai_eval.get("vibeCheck", "No data"),
        "aiVerdict": ai_eval.get("aiVerdict", "No data"),
        "skillGap": ai_eval.get("skillGaps", []),
        "detailedSkillGap": ai_eval.get("detailedSkillGap", []),
        "videoAnswers": response.get("videoAnswers", []),
        "status": admission.get("status", "Pending"),
        "decisionNotes": admission.get("decisionNotes", ""),
        "timestamp": ai_eval.get("evaluatedAt") or response.get("submittedAt"),
        "evaluationHistory": [] 
    }
    

@router.post("/submit-decision/{response_id}")
async def submit_decision(response_id: str, decision_data: dict, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(response_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    oid = ObjectId(response_id)
    status = decision_data.get("status")
    notes = decision_data.get("notes", "")
    
    if status not in ["Approved", "Bridge Course Recommended", "Retry Required"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    # Find Response
    response = responses_collection.find_one({"_id": oid})
    if not response:
        raise HTTPException(status_code=404, detail="Response not found")
    
    student_id = response.get("studentId")
    course_id = response.get("courseId")
    course = courses_collection.find_one({"_id": course_id})
    course_title = course.get("title", "Assessment") if course else "Assessment"
    
    welcome_letter = None
    institute_logo = None
    # Generate Confirmation Letter if Approved
    if status == "Approved":
        student = students_collection.find_one({"_id": student_id})
        student_name = f"{student.get('firstName', '')} {student.get('lastName', '')}" if student else "Student"
        
        # Fetch settings for dynamic letterhead and weightages
        settings = settings_collection.find_one({"type": "global_config"}) or {}
        mcq_w = settings.get("mcqWeightage", 40)
        video_w = settings.get("videoWeightage", 60)
        institute_logo = settings.get("instituteLogo")
        
        mcq_score = response.get("mcqScore", 0)
        ai_eval = ai_evaluations_collection.find_one({"responseId": oid})
        v_score = ai_eval.get("scores", {}).get("overallVideo", 0) if ai_eval else 0
        
        video_score_scaled = v_score * 10 if v_score <= 10 else v_score
        overall_avg = (mcq_score * mcq_w / 100) + (video_score_scaled * video_w / 100)
        
        try:
            welcome_letter = generate_confirmation_letter(student_name, course_title, round(overall_avg, 1), settings)
        except Exception as e:
            print(f"Failed to generate confirmation letter: {e}")

    # Update admissions_status_collection
    admissions_status_collection.update_one(
        {"responseId": oid},
        {"$set": {
            "responseId": oid,
            "studentId": student_id,
            "status": status,
            "decisionNotes": notes,
            "enrollmentLetter": welcome_letter,
            "instituteLogo": institute_logo,
            "decidedAt": datetime.utcnow()
        }},
        upsert=True
    )
    
    # --- Create a notification for the student ---
    notification_msg = f"Your evaluation for '{course_title}' has been reviewed."
    if status == "Approved":
        notification_msg = f"Congratulations! Your evaluation for '{course_title}' was Approved."
    elif status == "Bridge Course Recommended":
        notification_msg = f"A Bridge Course has been recommended for '{course_title}'."
    elif status == "Retry Required":
        notification_msg = f"You are required to retry the '{course_title}' assessment."
        
    notification = {
        "type": "admin_decision",
        "studentId": student_id,
        "courseId": course_id,
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
async def get_students(current_user: dict = Depends(get_current_user)):
    students = list(students_collection.find().sort("firstName", 1))
    
    results = []
    for student in students:
        sid = student["_id"]
        
        # Latest Response
        latest_response = responses_collection.find_one({"studentId": sid}, sort=[("submittedAt", -1)])
        latest_status = "Not Started"
        v_score = "N/A"
        m_score = "N/A"
        
        if latest_response:
            rid = latest_response["_id"]
            adm = admissions_status_collection.find_one({"responseId": rid})
            ai = ai_evaluations_collection.find_one({"responseId": rid})
            
            latest_status = adm.get("status", "Pending") if adm else "Pending"
            v_score = round(ai.get("scores", {}).get("overallVideo", 0), 2) if ai else "N/A"
            m_score = round(latest_response.get("mcqScore", 0), 2) if latest_response.get("mcqScore") is not None else "N/A"
            
        results.append({
            "id": str(sid),
            "name": f"{student.get('firstName', '')} {student.get('lastName', '')}",
            "email": student.get("email"),
            "mcqScore": m_score,
            "videoScore": v_score,
            "status": latest_status
        })
        
    return results

@router.get("/students/{student_id}")
async def get_student_detail(student_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail="Invalid Student ID format")
    
    sid = ObjectId(student_id)
    student = students_collection.find_one({"_id": sid})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    student["id"] = str(student.pop("_id"))
    
    # Aggregate Evaluation History (Normalized only)
    pipeline = [
        {"$match": {"studentId": sid}},
        {"$sort": {"submittedAt": -1}},
        {
            "$lookup": {
                "from": "ai_evaluations",
                "localField": "_id",
                "foreignField": "responseId",
                "as": "ai_eval"
            }
        },
        {
            "$lookup": {
                "from": "admissions_status",
                "localField": "_id",
                "foreignField": "responseId",
                "as": "admission"
            }
        },
        {"$unwind": {"path": "$ai_eval", "preserveNullAndEmptyArrays": True}},
        {"$unwind": {"path": "$admission", "preserveNullAndEmptyArrays": True}}
    ]
    
    normalized_attempts = list(responses_collection.aggregate(pipeline))
    all_evaluations = []
    
    course_titles = {}
    for item in normalized_attempts:
        cid = item.get("courseId")
        if str(cid) not in course_titles:
            course = courses_collection.find_one({"_id": cid})
            course_titles[str(cid)] = course.get("title") if course else "Unknown Assessment"
            
        all_evaluations.append({
            "id": str(item["_id"]),
            "courseTitle": course_titles[str(cid)], 
            "timestamp": item.get("submittedAt").isoformat() if item.get("submittedAt") else None,
            "score": round(item.get("mcqScore", 0), 2),
            "overallVideoScore": round(item.get("ai_eval", {}).get("scores", {}).get("overallVideo", 0), 2) if item.get("ai_eval") else 0,
            "status": item.get("admission", {}).get("status", "Pending") if item.get("admission") else "Pending",
            "skillGap": item.get("ai_eval", {}).get("skillGaps", []) if item.get("ai_eval") else [],
            "isHistory": False
        })

    return {
        "profile": student,
        "results": all_evaluations
    }

@router.get("/settings", response_model=SystemSettings)
async def get_system_settings(current_user: dict = Depends(get_current_user)):
    settings = settings_collection.find_one({"type": "global_config"})
    if not settings:
        return SystemSettings(
            instituteName="",
            instituteAddress="",
            instituteWebsite="",
            instituteEmail="",
            signatureText=""
        )
    
    settings.pop("_id", None)
    return settings

@router.post("/settings")
async def update_system_settings(settings: SystemSettings, current_user: dict = Depends(get_current_user)):
    settings_dict = settings.model_dump()
    settings_dict["type"] = "global_config"
    settings_dict["updatedAt"] = datetime.utcnow()
    
    settings_collection.update_one(
        {"type": "global_config"},
        {"$set": settings_dict},
        upsert=True
    )
    
    return {"message": "System settings updated successfully"}

# --- Announcement Routes ---

@router.post("/announcements")
async def create_announcement(announcement: AnnouncementCreate, current_user: dict = Depends(get_current_user)):
    announcement_dict = announcement.model_dump()
    announcement_dict["createdAt"] = datetime.utcnow()
    
    result = announcements_collection.insert_one(announcement_dict)
    return {"message": "Announcement created successfully", "id": str(result.inserted_id)}

@router.get("/announcements")
async def get_announcements(current_user: dict = Depends(get_current_user)):
    announcements = list(announcements_collection.find().sort("createdAt", -1))
    for a in announcements:
        a["id"] = str(a.pop("_id"))
        
        if a.get("expiryDate"):
            try:
                expiry = datetime.fromisoformat(a["expiryDate"])
                a["status"] = "Active" if expiry > datetime.utcnow() else "Expired"
            except:
                a["status"] = "Active"
        else:
            a["status"] = "Active"
            
    return announcements

@router.put("/announcements/{announcement_id}")
async def update_announcement(announcement_id: str, announcement: AnnouncementUpdate, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(announcement_id):
        raise HTTPException(status_code=400, detail="Invalid announcement ID")
        
    update_data = {k: v for k, v in announcement.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
        
    result = announcements_collection.update_one(
        {"_id": ObjectId(announcement_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
        
    return {"message": "Announcement updated successfully"}

@router.delete("/announcements/{announcement_id}")
async def delete_announcement(announcement_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(announcement_id):
        raise HTTPException(status_code=400, detail="Invalid announcement ID")
        
    result = announcements_collection.delete_one({"_id": ObjectId(announcement_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
        
    return {"message": "Announcement deleted successfully"}
