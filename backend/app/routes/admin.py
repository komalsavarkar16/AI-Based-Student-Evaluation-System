from fastapi import APIRouter, HTTPException, status
from app.schemas.admin import AdminCreate, AdminLogin, AdminUpdate
from bson import ObjectId
from app.database.connection import db, admins_collection, results_collection, students_collection, responses_collection, ai_evaluations_collection, admissions_status_collection, bridge_curriculum_collection, courses_collection
from app.core.security import hash_password, verify_password, create_access_token
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

    # Determine expiration based on Remember Me
    remember_me = data.remember_me
    if remember_me:
        # 30 days
        expiry_time = timedelta(days=30)
        max_age = 2592000  # seconds (30 days)
    else:
        # 1 hour
        expiry_time = timedelta(hours=1)
        max_age = 3600  # seconds (1 hour)

    # Create the token
    access_token = create_access_token(
        data={"sub": str(admin["_id"]), "role": admin["role"]},
        expires_delta=expiry_time
    )

    # Prepare response data
    content = {
        "message": "Login successful",
        "access_token": access_token, # Keep it for localStorage
        "token_type": "bearer",
        "admin": {
            "id": str(admin["_id"]),
            "email": admin["email"],
            "firstName": admin["firstName"],
            "lastName": admin["lastName"],
        },
        "role": admin["role"]
    }

    # Create JSONResponse to set the cookie
    from fastapi.responses import JSONResponse
    response = JSONResponse(content=content)
    
    # Set the cookie (for future unification or if frontend starts using it)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,  # Prevent JS access
        max_age=max_age,
        samesite="lax",
        secure=False,    # Set to True in Production
    )

    return response

@router.post("/logout")
async def logout_admin():
    from fastapi.responses import JSONResponse
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie("access_token")
    return response

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
    # 1. New Normalized Data
    pipeline_norm = [
        {"$unwind": "$skillGaps"},
        {"$group": {"_id": "$skillGaps", "count": {"$sum": 1}}}
    ]
    norm_results = list(ai_evaluations_collection.aggregate(pipeline_norm))
    
    # 2. Legacy Data
    pipeline_legacy = [
        {"$unwind": "$skillGap"},
        {"$group": {"_id": "$skillGap", "count": {"$sum": 1}}}
    ]
    legacy_results = list(results_collection.aggregate(pipeline_legacy))
    
    # Merge
    merged = {}
    for r in norm_results: merged[r["_id"]] = merged.get(r["_id"], 0) + r["count"]
    for r in legacy_results: merged[r["_id"]] = merged.get(r["_id"], 0) + r["count"]
    
    sorted_merged = sorted(merged.items(), key=lambda x: x[1], reverse=True)[:5]
    return [{"skill": k, "value": v} for k, v in sorted_merged]
    

@router.get("/analytics/course-performance")
async def get_course_performance():
    # Fetch from both legacy and new
    legacy_pipeline = [
        {"$group": {"_id": "$courseTitle", "avg": {"$avg": "$overallVideoScore"}, "count": {"$sum": 1}}}
    ]
    # For normalized, we just use a generic title or fetch course names (simplified for now)
    norm_pipeline = [
        {"$group": {"_id": "Assessment", "avg": {"$avg": "$scores.overallVideo"}, "count": {"$sum": 1}}}
    ]
    
    l_res = list(results_collection.aggregate(legacy_pipeline))
    n_res = list(ai_evaluations_collection.aggregate(norm_pipeline))
    
    # Merge (simplified)
    # In a real scenario, you'd lookup course names by courseId
    return [{"name": r["_id"], "score": round(r["avg"], 2) if r["avg"] else 0, "students": r["count"]} for r in l_res + n_res]
    

@router.get("/analytics/overall-status")
async def get_overall_status():
    # Aggregate from both legacy and normalized
    l_pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    n_pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    
    l_results = {r["_id"] or "Pending": r["count"] for r in results_collection.aggregate(l_pipeline)}
    n_results = {r["_id"] or "Pending": r["count"] for r in admissions_status_collection.aggregate(n_pipeline)}
    
    # Merge keys
    all_keys = set(l_results.keys()) | set(n_results.keys())
    status_counts = {k: l_results.get(k, 0) + n_results.get(k, 0) for k in all_keys}
    
    approved = status_counts.get("Approved", 0)
    retry = status_counts.get("Retry Required", 0)
    bridge_total = status_counts.get("Bridge Course Recommended", 0) + status_counts.get("Bridge Course In Progress", 0)
    pending = status_counts.get("Pending", 0)
    ready = status_counts.get("READY_FOR_RETEST", 0)
    
    total = sum(status_counts.values())
    
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
    

@router.get("/all-evaluations")
async def get_all_evaluations():
    # 1. New Normalized Aggregation
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
    
    # Process normalized records
    for item in normalized_data:
        results.append({
            "id": str(item["_id"]),
            "studentName": f"{item['student'].get('firstName')} {item['student'].get('lastName')}" if item.get('student') else "Unknown",
            "courseTitle": "Assessment", # Could be fetched from courseId if needed
            "mcqScore": item.get("mcqScore", 0),
            "videoScore": round(item.get("ai_eval", {}).get("scores", {}).get("overallVideo", 0), 2) if item.get("ai_eval") else "Pending",
            "eligibilitySignal": item.get("ai_eval", {}).get("eligibilitySignal", "-"),
            "status": item.get("admission", {}).get("status", "Pending"),
            "skillGap": item.get("ai_eval", {}).get("skillGaps", []),
            "timestamp": item.get("submittedAt"),
            "historyCount": 0 # Normalized history will be added later
        })

    # 2. Legacy Fallback (only if no normalized data exists or to complement it)
    # For now, we complement normalized data with legacy data if it's not already represented
    seen_ids = set() # To avoid duplication if we move IDs 1:1 later
    
    # Fetch all results that have video evaluations from legacy collection
    evaluations = list(db.test_results.find(
        {"videoAnswers": {"$exists": True}}
    ).sort("timestamp", -1))
    
    for eval in evaluations:
        # Check if this student/course combo is already in normalized results (basic heuristic)
        # This is temporary until full migration
        student_id_str = str(eval["studentId"])
        course_id_str = str(eval["courseId"])
        is_already_present = any(
            str(r.get("studentId")) == student_id_str and str(r.get("courseId")) == course_id_str 
            for r in normalized_data
        )
        
        if not is_already_present:
            student = db.students.find_one({"_id": eval["studentId"]})
            results.append({
                "id": str(eval["_id"]),
                "studentName": f"{student.get('firstName')} {student.get('lastName')}" if student else "Unknown",
                "courseTitle": eval.get("courseTitle"),
                "mcqScore": eval.get("score", 0),
                "videoScore": round(eval.get("overallVideoScore", 0), 2) if "overallVideoScore" in eval else "Pending",
                "eligibilitySignal": eval.get("eligibilitySignal", "-"),
                "status": eval.get("status", "Pending"),
                "skillGap": eval.get("skillGap", []),
                "timestamp": eval.get("evaluatedAt") or eval.get("timestamp"),
                "historyCount": len(eval.get("evaluationHistory", []))
            })
            
    return results
    

@router.get("/evaluation-report/{result_id}")
async def get_evaluation_report(result_id: str):
    if not ObjectId.is_valid(result_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    # 1. Try Normalized Data (assuming result_id is a ResponseID)
    response = responses_collection.find_one({"_id": ObjectId(result_id)})
    if response:
        response_id = response["_id"]
        ai_eval = ai_evaluations_collection.find_one({"responseId": response_id}) or {}
        admission = admissions_status_collection.find_one({"responseId": response_id}) or {}
        bridge = bridge_curriculum_collection.find_one({"responseId": response_id}) or {}
        student = students_collection.find_one({"_id": response["studentId"]})
        
        return {
            "id": str(response_id),
            "student": {
                "name": f"{student.get('firstName')} {student.get('lastName')}" if student else "Unknown",
                "email": student.get("email") if student else "N/A"
            },
            "courseTitle": "Assessment", 
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

    # 2. Legacy Fallback (test_results collection)
    result = db.test_results.find_one({"_id": ObjectId(result_id)})
    if not result:
        raise HTTPException(status_code=404, detail="Evaluation report not found")
        
    student = db.students.find_one({"_id": result["studentId"]})
    
    return {
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

    # --- Normalized Logic (Sync with admissions_status_collection) ---
    student_id = result.get("studentId")
    course_id = result.get("courseId")
    response_id = None
    welcome_letter = None

    # 1. Find the corresponding response
    if student_id and course_id:
        response_doc = responses_collection.find_one(
            {"studentId": student_id, "courseId": course_id},
            sort=[("submittedAt", -1)]
        )
        if response_doc:
            response_id = response_doc["_id"]

    # 2. Generate Welcome Letter if Approved
    if status == "Approved":
        student = db.students.find_one({"_id": student_id})
        student_name = f"{student.get('firstName')} {student.get('lastName')}" if student else "Student"
        course_title = result.get("courseTitle", "Assessment")
        
        # Calculate a simple average: scaling overallVideoScore (0-10) to 100
        mcq_score = result.get("score", 0)
        v_score = result.get("overallVideoScore", 0)
        video_score_scaled = v_score * 10 if v_score <= 10 else v_score
        overall_avg = (mcq_score + video_score_scaled) / 2
        
        try:
            welcome_letter = generate_welcome_letter(student_name, course_title, round(overall_avg, 1))
            # Sync to legacy collection
            results_collection.update_one(
                {"_id": ObjectId(result_id)},
                {"$set": {"enrollmentLetter": welcome_letter}}
            )
        except Exception as e:
            print(f"Failed to generate welcome letter: {e}")

    # 3. Update admissions_status_collection
    if response_id:
        admissions_status_collection.update_one(
            {"responseId": response_id},
            {"$set": {
                "responseId": response_id,
                "studentId": student_id,
                "status": status,
                "decisionNotes": notes,
                "enrollmentLetter": welcome_letter,
                "decidedAt": datetime.utcnow()
            }},
            upsert=True
        )
    
        
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
    students = list(students_collection.find().sort("firstName", 1))
    
    results = []
    for student in students:
        sid = student["_id"]
        
        # Check normalized first
        latest_response = responses_collection.find_one({"studentId": sid}, sort=[("submittedAt", -1)])
        latest_status = "Pending"
        v_score = "N/A"
        m_score = "N/A"
        
        if latest_response:
            rid = latest_response["_id"]
            adm = admissions_status_collection.find_one({"responseId": rid})
            ai = ai_evaluations_collection.find_one({"responseId": rid})
            
            latest_status = adm.get("status", "Pending") if adm else "Pending"
            v_score = round(ai.get("scores", {}).get("overallVideo", 0), 2) if ai else "N/A"
            m_score = latest_response.get("mcqScore", "N/A")
        else:
            # Fallback to legacy
            l_mcq = results_collection.find_one({"studentId": sid, "score": {"$exists": True}}, sort=[("timestamp", -1)])
            l_vid = results_collection.find_one({"studentId": sid, "overallVideoScore": {"$exists": True}}, sort=[("timestamp", -1)])
            
            latest_status = l_vid.get("status") if l_vid else (l_mcq.get("status") if l_mcq else "Pending")
            v_score = round(l_vid.get("overallVideoScore"), 2) if l_vid else "N/A"
            m_score = l_mcq.get("score") if l_mcq else "N/A"
            
        results.append({
            "id": str(sid),
            "name": f"{student.get('firstName')} {student.get('lastName')}",
            "email": student.get("email"),
            "mcqScore": m_score,
            "videoScore": v_score,
            "status": latest_status
        })
        
    return results

@router.get("/students/{student_id}")
async def get_student_detail(student_id: str):
    try:
        sid = ObjectId(student_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid Student ID format")

    student = students_collection.find_one({"_id": sid})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    student["id"] = str(student.pop("_id"))
    
    # --- Aggregate Evaluation History ---
    all_evaluations = []
    
    # Cache for course titles
    course_titles = {}

    # 1. New Normalized Data (student_responses -> ai_evaluations -> admissions_status)
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
    for item in normalized_attempts:
        r_id = str(item["_id"])
        cid = item.get("courseId")
        
        # Fetch title if not cached
        if str(cid) not in course_titles:
            course = courses_collection.find_one({"_id": cid})
            course_titles[str(cid)] = course.get("title") if course else "Unknown Assessment"
            
        all_evaluations.append({
            "id": r_id,
            "courseTitle": course_titles[str(cid)], 
            "timestamp": item.get("submittedAt").isoformat() if item.get("submittedAt") else None,
            "score": item.get("mcqScore", 0),
            "overallVideoScore": round(item.get("ai_eval", {}).get("scores", {}).get("overallVideo", 0), 2) if item.get("ai_eval") else 0,
            "status": item.get("admission", {}).get("status", "Pending") if item.get("admission") else "Pending",
            "skillGap": item.get("ai_eval", {}).get("skillGaps", []) if item.get("ai_eval") else [],
            "isHistory": False
        })

    # 2. Legacy Results
    legacy_results = list(results_collection.find({"studentId": sid}).sort("timestamp", -1))
    for r in legacy_results:
        r_id = str(r.get("_id"))
        
        # Robust check for duplicates by comparing same student, course, and Score + Timestamp match
        # (This avoids showing the same entry twice if it exists in both collections)
        is_migrated = any(
            eval.get("score") == r.get("score") and 
            eval.get("courseTitle") == r.get("courseTitle")
            for eval in all_evaluations
        )
        if is_migrated: continue

        # Explicitly map fields to avoid ObjectId serialization issues
        all_evaluations.append({
            "id": r_id,
            "courseTitle": r.get("courseTitle", "Assessment"),
            "timestamp": r.get("timestamp").isoformat() if r.get("timestamp") else None,
            "score": r.get("score", 0),
            "overallVideoScore": round(r.get("overallVideoScore", 0), 2) if r.get("overallVideoScore") else 0,
            "status": r.get("status", "Pending"),
            "skillGap": r.get("skillGap", []),
            "isHistory": False
        })
        
        # History sub-entries (Legacy)
        if "evaluationHistory" in r:
            for hist in r["evaluationHistory"]:
                all_evaluations.append({
                    "id": f"{r_id}_hist_{hist.get('archivedAt')}", 
                    "isHistory": True, 
                    "courseTitle": r.get("courseTitle"),
                    "score": hist.get("mcqScore", 0),
                    "overallVideoScore": round(hist.get("overallVideoScore", 0), 2) if hist.get("overallVideoScore") else 0,
                    "status": hist.get("status", "Archived"),
                    "skillGap": hist.get("skillGap", []),
                    "timestamp": hist.get("archivedAt").isoformat() if hist.get("archivedAt") else None
                })

    # Sort everything by date
    all_evaluations.sort(key=lambda x: x.get("timestamp") or "", reverse=True)

    return {
        "profile": student,
        "results": all_evaluations
    }
