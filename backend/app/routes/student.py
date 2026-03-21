from fastapi import APIRouter, HTTPException, status, File, UploadFile, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from app.schemas.student import StudentCreate, StudentLogin, StudentProfile, StudentProfileUpdate, TestResult
from app.database.connection import db, students_collection, results_collection, courses_collection, video_questions_collection
from app.core.security import hash_password, verify_password, create_access_token
from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest
from app.services.email_service import send_reset_email
from app.services.ai_service import analyze_test_results, evaluate_video_answer, discover_skill_gaps, generate_overall_video_evaluation, generate_bridge_path_b_content
from app.services.cloudinary_service import upload_video
from app.services.transcription_service import transcribe_videos
import secrets
import re
import os
from datetime import datetime, timedelta
from bson import ObjectId
from typing import List
from pydantic import BaseModel

router = APIRouter(prefix="/student", tags=["Student"])

@router.post("/register")
def register_student(student: StudentCreate):
    student_dict = student.model_dump()
    student_dict["password"] = hash_password(student.password)
    student_dict["role"] = "student"
    student_dict.pop("confirmPassword", None)
    db.students.insert_one(student_dict)
    return {"message": "Student registered successfully"}

@router.post("/login")
async def login_student(data: StudentLogin):
    student = students_collection.find_one({"email": data.email})
    
    if not student:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not verify_password(data.password, student["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

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
        data={"sub": str(student["_id"]), "role": student["role"]},
        expires_delta=expiry_time
    )

    # Prepare response data
    content = {
        "message": "Login successful",
        "access_token": access_token, # Add this to support localStorage
        "role": student["role"],
        "student": {
            "id": str(student["_id"]),
            "email": student["email"],
            "firstName": student["firstName"],
            "lastName": student["lastName"],
        }
    }

    # Create JSONResponse to set the cookie
    response = JSONResponse(content=content)
    
    # Set the cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,  # Prevent JS access (Secure)
        max_age=max_age,
        samesite="lax", # Recommended for local dev
        secure=False,    # Set to True in Production with HTTPS
    )

    return response

@router.post("/logout")
async def logout_student():
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie("access_token")
    return response


@router.get("/profile/{student_id}", response_model=StudentProfile)
async def get_student_profile(student_id: str):
    try:
        student = students_collection.find_one({"_id": ObjectId(student_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid student ID format")
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    student["id"] = str(student["_id"])
    return student

@router.put("/profile/{student_id}")
async def update_student_profile(student_id: str, profile_data: StudentProfileUpdate):
    try:
        update_data = {k: v for k, v in profile_data.model_dump().items() if v is not None}
        if not update_data:
            return {"message": "No changes provided"}
        result = students_collection.update_one({"_id": ObjectId(student_id)}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Student not found")
        return {"message": "Profile updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    student = students_collection.find_one({"email": data.email})
    if not student:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    token = secrets.token_urlsafe(32)
    expiry = datetime.utcnow() + timedelta(hours=1)
    students_collection.update_one({"_id": student["_id"]}, {"$set": {"reset_token": token, "reset_token_expiry": expiry}})
    await send_reset_email(data.email, token, "student")
    return {"message": "If your email is registered, you will receive a reset link shortly."}

@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    student = students_collection.find_one({"reset_token": data.token, "reset_token_expiry": {"$gt": datetime.utcnow()}})
    if not student:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")
    hashed_password = hash_password(data.new_password)
    students_collection.update_one({"_id": student["_id"]}, {"$set": {"password": hashed_password}, "$unset": {"reset_token": "", "reset_token_expiry": ""}})
    return {"message": "Password reset successfully"}

@router.post("/change-password/{student_id}")
async def change_password(student_id: str, data: dict):
    old_password = data.get("oldPassword")
    new_password = data.get("newPassword")
    
    if not old_password or not new_password:
        raise HTTPException(status_code=400, detail="Missing passwords")

    student = students_collection.find_one({"_id": ObjectId(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    if not verify_password(old_password, student["password"]):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    hashed_password = hash_password(new_password)
    students_collection.update_one({"_id": student["_id"]}, {"$set": {"password": hashed_password}})
    return {"message": "Password updated successfully"}

@router.post("/submit-test")
async def submit_test(result: TestResult):
    result_dict = result.model_dump()
    result_dict["studentId"] = ObjectId(result.studentId)
    result_dict["courseId"] = ObjectId(result.courseId)
    result_dict["timestamp"] = datetime.utcnow()
    
    # Check if a pending document for this test already exists (e.g. from a video test submitted first)
    existing_result = results_collection.find_one(
        {
            "studentId": ObjectId(result.studentId),
            "courseId": ObjectId(result.courseId)
        },
        sort=[("timestamp", -1)]
    )

    if existing_result:
        # Update existing record
        results_collection.update_one(
            {"_id": existing_result["_id"]},
            {"$set": {
                "score": result.score,
                "totalQuestions": result.totalQuestions,
                "correctAnswers": result.correctAnswers,
                "answers": result.answers,
                "courseTitle": result.courseTitle,
                "status": "Pending",
                "timestamp": datetime.utcnow()
            }}
        )
    else:
        results_collection.insert_one(result_dict)
    
    analysis = None
    if result.score < 70:
        # Call AI to identify weak areas. Using only incorrect answers might be better or full log?
        # User requested Identify weak skills (AI) from answers
        analysis = analyze_test_results(result.answers, result.courseTitle)
    
    return {
        "message": "Test results submitted successfully", 
        "score": result.score,
        "pass_status": result.score >= 70,
        "analysis": analysis
    }

@router.get("/check-test-status/{student_id}/{course_id}")
async def check_test_status(student_id: str, course_id: str):
    try:
        result = results_collection.find_one({
            "studentId": ObjectId(student_id),
            "courseId": ObjectId(course_id)
        }, sort={"timestamp": -1}) # Get the latest result
        
        if not result:
            return {"completed": False, "passed": False, "score": 0}
            
        return {
            "completed": True, 
            "passed": result.get("score", 0) >= 70,
            "score": result.get("score", 0),
            "videoTestSubmittedAt": result.get("videoTestSubmittedAt"),
            "videoTestEvaluationStatus": result.get("videoTestEvaluationStatus", "not_started"),
            "videoAnswers": result.get("videoAnswers", []),
            "overallVideoScore": result.get("overallVideoScore", 0),
            "skillGap": result.get("skillGap", []),
            "detailedSkillGap": result.get("detailedSkillGap", []),
            "eligibilitySignal": result.get("eligibilitySignal", "-"),
            "executiveSummary": result.get("executiveSummary", ""),
            "overallReasoning": result.get("overallReasoning", ""),
            "status": result.get("status", "Pending"),
            "decisionNotes": result.get("decisionNotes", ""),
            "analysis": result.get("analysis", {}),
            "bridgeChecklistData": result.get("bridgeChecklistData", None),
            "enrollmentLetter": result.get("enrollmentLetter", None),
            "evaluationHistory": result.get("evaluationHistory", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
@router.post("/submit-video-test")
async def submit_video_test(
    background_tasks: BackgroundTasks,
    studentId: str = Form(...),
    courseId: str = Form(...),
    courseTitle: str = Form(...),
    files: List[UploadFile] = File(...)
):
    try:
        # Sanitize course title for folder name (alphanumeric and underscores only)
        safe_course_title = re.sub(r'[^a-zA-Z0-9_-]', '_', courseTitle)
        folder_path = f"student_videos/{safe_course_title}/student_{studentId}"
        
        video_urls = []
        
        errors = []
        # Read and prepare all file contents beforehand to release UploadFile resources quickly
        file_data = []
        for file in files:
            content = await file.read()
            if len(content) > 0:
                filename = file.filename or "unknown_file.mp4"
                public_id = re.sub(r'[^a-zA-Z0-9_-]', '_', filename.split('.')[0])
                file_data.append((content, public_id, filename))
            else:
                print(f"Warning: File {file.filename} is empty")

        if not file_data:
            raise HTTPException(status_code=400, detail="No valid video files uploaded.")

        import asyncio
        from concurrent.futures import ThreadPoolExecutor
        
        # Parallelize Cloudinary uploads using a thread pool
        def upload_worker(data):
            content, pid, fname = data
            try:
                cloudinary_res = upload_video(content, folder_path, pid)
                if cloudinary_res:
                    return {"question": pid, "url": cloudinary_res.get("secure_url")}
            except Exception as e:
                return {"error": str(e), "filename": fname}
            return None

        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as executor:
            upload_results = await asyncio.gather(*[
                loop.run_in_executor(executor, upload_worker, data) for data in file_data
            ])

        for res in upload_results:
            if res and "url" in res:
                video_urls.append(res)
            elif res and "error" in res:
                errors.append(f"{res['filename']}: {res['error']}")

        if not video_urls:
            error_detail = "Failed to upload videos."
            if errors:
                error_detail += " Details: " + "; ".join(errors)
            raise HTTPException(status_code=500, detail=error_detail)

        # Construct a folder link for the admin to see all videos in Cloudinary Console
        cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
        # Standard Cloudinary Console folder URL pattern
        folder_url = f"https://console.cloudinary.com/console/c-{cloud_name}/media_library/folders/%2F{folder_path.replace('/', '%2F')}"

        # Update MongoDB
        # We look for the latest test result to update it with video info
        update_data = {
            "videoUrls": video_urls, # Storing all individual video URLs
            "videoUrl": folder_url, # Now storing the folder link as requested
            "videoTestSubmittedAt": datetime.utcnow().strftime("%Y-%m-%d"),
            "videoTestEvaluationStatus": "pending",
            "status": "Pending",
            "timestamp": datetime.utcnow() # Update timestamp so it shows at the top for admins
        }

        # Try to find the latest existing document
        existing_result = results_collection.find_one(
            {
                "studentId": ObjectId(studentId),
                "courseId": ObjectId(courseId)
            },
            sort=[("timestamp", -1)]
        )

        if existing_result:
            results_collection.update_one(
                {"_id": existing_result["_id"]},
                {"$set": update_data}
            )
        else:
            # If no MCQ result was found, create a new combined entry 
            new_record = {
                "studentId": ObjectId(studentId),
                "courseId": ObjectId(courseId),
                "courseTitle": courseTitle,
                "timestamp": datetime.utcnow(),
                "score": 0,
                "answers": [],
                "status": "Pending"
            }
            new_record.update(update_data)
            results_collection.insert_one(new_record)

        # Trigger background transcription task
        background_tasks.add_task(transcribe_videos, studentId, courseId, video_urls)

        return {
            "message": "Video test submitted successfully. Transcription is in progress.",
            "videoUrls": video_urls
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def process_video_test_analysis(student_id: str, course_id: str):
    try:
        # 1. Fetch the latest test result
        result = results_collection.find_one({
            "studentId": ObjectId(student_id),
            "courseId": ObjectId(course_id)
        }, sort=[("timestamp", -1)])
        
        if not result or "videoAnswers" not in result:
            print("No video answers found for analysis")
            return

        # 2. Identify which questions were used (Retest vs Standard)
        course = courses_collection.find_one({"_id": ObjectId(course_id)})
        retest_questions = result.get("retestQuestions")
        
        if retest_questions:
            active_questions = retest_questions
        else:
            # Fallback to standard video questions for the course
            video_questions_doc = video_questions_collection.find_one({"courseId": ObjectId(course_id)})
            active_questions = video_questions_doc.get("videoQuestions", []) if video_questions_doc else []
        
        if not course:
            print("Course not found")
            return
        
        # 3. Analyze each answer
        total_score = 0
        count = 0
        updated_answers = []
        
        for q_answer in result["videoAnswers"]:
            question_id = q_answer.get("questionId")
            transcript = q_answer.get("transcript")
            
            # Map transcript to the actual question data
            try:
                # Find the numeric index from IDs like "Q1", "Video_1", "question_1"
                import re
                match = re.search(r'\d+', question_id)
                idx = int(match.group()) - 1 if match else -1
                
                if 0 <= idx < len(active_questions):
                    question_obj = active_questions[idx]
                    question_data = {
                        "question": question_obj.get("question"), 
                        "relatedSkill": question_obj.get("relatedSkill", "General"),
                        "expectedConcepts": question_obj.get("expectedConcepts", [])
                    }
                    related_skill = question_obj.get("relatedSkill", "General")
                else:
                    question_data = {"question": question_id, "relatedSkill": "General"}
                    related_skill = "General"
            except Exception as e:
                print(f"Index mapping error for {question_id}: {e}")
                question_data = {"question": question_id, "relatedSkill": "General"}
                related_skill = "General"

            # Call AI Evaluation
            analysis = evaluate_video_answer(question_data, transcript, course)
            
            q_answer["analysis"] = analysis
            q_answer["relatedSkill"] = related_skill
            updated_answers.append(q_answer)
            
            # Update scoring
            score = analysis.get("technicalScore", 0)
            total_score += score
            count += 1

        # 4. Final results logic
        avg_score = total_score / count if count > 0 else 0
        
        mcq_answers = result.get("answers", [])
        detailed_skill_gaps = discover_skill_gaps(mcq_answers, updated_answers, course, threshold=7.0)
        
        # Flatten the detailed categorical gaps into a simple list of skills to not break old frontend code just in case
        unique_weak_skills = []
        for cat in detailed_skill_gaps:
            for skill in cat.get("skills", []):
                if skill.get("isGap", False):
                    unique_weak_skills.append(skill.get("skillName"))
        unique_weak_skills = list(set([s for s in unique_weak_skills if s != "General"]))

        
        # 4.1 Overall Performance Signal (AI-based)
        overall_eval = generate_overall_video_evaluation(updated_answers, course)

        # 5. Update DB
        results_collection.update_one(
            {"_id": result["_id"]},
            {"$set": {
                "videoAnswers": updated_answers,
                "overallVideoScore": avg_score,
                "detailedSkillGap": detailed_skill_gaps,
                "skillGap": unique_weak_skills,
                "videoTestEvaluationStatus": "completed",
                "eligibilitySignal": overall_eval.get("overallEligibilitySignal"),
                "executiveSummary": overall_eval.get("executiveSummary"),
                "overallReasoning": overall_eval.get("overallReasoning"),
                "competencyGapReport": overall_eval.get("competencyGap"),
                "vibeCheck": overall_eval.get("vibeCheck"),
                "aiVerdict": overall_eval.get("aiVerdict"),
                "evaluatedAt": datetime.utcnow()
            }}
        )
        
        # 6. Notify Admin
        notify_admin_of_evaluation(student_id, course_id, avg_score, unique_weak_skills)
        
        print(f"AI analysis completed for student {student_id} in course {course_id}")
        
    except Exception as e:
        print(f"Error in process_video_test_analysis: {str(e)}")

def notify_admin_of_evaluation(student_id, course_id, score, skill_gap):
    try:
        student = students_collection.find_one({"_id": ObjectId(student_id)})
        course = courses_collection.find_one({"_id": ObjectId(course_id)})
        
        if not student or not course:
            return

        notification = {
            "type": "video_test_evaluation",
            "studentId": ObjectId(student_id),
            "studentName": f"{student.get('firstName')} {student.get('lastName')}",
            "courseId": ObjectId(course_id),
            "courseTitle": course.get('title'),
            "score": round(score, 2),
            "skillGap": skill_gap,
            "status": "unread",
            "timestamp": datetime.utcnow()
        }
        
        # Insert into a notifications collection in the main db
        db.notifications.insert_one(notification)
        print("Admin notification created")
    except Exception as e:
        print(f"Failed to notify admin: {str(e)}")

@router.get("/notifications/{student_id}")
async def get_student_notifications(student_id: str):
    if not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail="Invalid student ID")
        
    notifications = list(db.notifications.find({
        "studentId": ObjectId(student_id),
        "type": "admin_decision" 
    }).sort("timestamp", -1))
    
    results = []
    for n in notifications:
        n["_id"] = str(n["_id"])
        n["studentId"] = str(n["studentId"])
        if "courseId" in n and n["courseId"]:
            n["courseId"] = str(n["courseId"])
        results.append(n)
        
    return results

@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status_code=400, detail="Invalid notification ID")
        
    result = db.notifications.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"isRead": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    return {"message": "Notification marked as read"}

class BridgePathRequest(BaseModel):
    skillGap: list[str]

@router.post("/bridge-path-b")
async def get_bridge_path_b(request: BridgePathRequest):
    try:
        content = generate_bridge_path_b_content(request.skillGap)
        return content
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/start-bridge-course/{student_id}/{course_id}")
async def start_bridge_course(student_id: str, course_id: str):
    result = results_collection.find_one({
        "studentId": ObjectId(student_id),
        "courseId": ObjectId(course_id)
    }, sort=[("timestamp", -1)])
    
    if not result:
        raise HTTPException(status_code=404, detail="Test not found")
        
    checklist_data = generate_bridge_path_b_content(result.get("skillGap", []))
    
    # Add a checked property to each item natively
    for item in checklist_data.get("checklist", []):
        item["checked"] = False
        
    results_collection.update_one(
        {"_id": result["_id"]},
        {"$set": {
            "status": "Bridge Course In Progress",
            "bridgeChecklistData": checklist_data
        }}
    )
    return {"message": "Bridge course started", "data": checklist_data}

class CheckListUpdateRequest(BaseModel):
    checklistData: dict

@router.post("/update-bridge-checklist/{student_id}/{course_id}")
async def update_bridge_checklist(student_id: str, course_id: str, request: CheckListUpdateRequest):
    results_collection.update_one(
        {"studentId": ObjectId(student_id), "courseId": ObjectId(course_id)},
        {"$set": {"bridgeChecklistData": request.checklistData}}
    )
    return {"message": "Updated"}

@router.post("/finish-bridge-course/{student_id}/{course_id}")
async def finish_bridge_course(student_id: str, course_id: str):
    # Fetch existing to archive it
    existing = results_collection.find_one({"studentId": ObjectId(student_id), "courseId": ObjectId(course_id)}, sort=[("timestamp", -1)])
    
    if not existing:
        raise HTTPException(status_code=404, detail="Test results not found")

    # Prepare historical entry
    history_entry = {
        "overallVideoScore": existing.get("overallVideoScore"),
        "detailedSkillGap": existing.get("detailedSkillGap"),
        "skillGap": existing.get("skillGap"),
        "eligibilitySignal": existing.get("eligibilitySignal"),
        "executiveSummary": existing.get("executiveSummary"),
        "overallReasoning": existing.get("overallReasoning"),
        "evaluatedAt": existing.get("evaluatedAt"),
        "videoAnswers": existing.get("videoAnswers"),
        "competencyGapReport": existing.get("competencyGapReport"),
        "vibeCheck": existing.get("vibeCheck"),
        "aiVerdict": existing.get("aiVerdict"),
        "bridgeChecklistData": existing.get("bridgeChecklistData"),
        "archivedAt": datetime.utcnow()
    }

    # Remove None values
    history_entry = {k: v for k, v in history_entry.items() if v is not None}

    results_collection.update_many(
        {"studentId": ObjectId(student_id), "courseId": ObjectId(course_id)},
        {
            "$set": {
                "status": "READY_FOR_RETEST",
                "videoTestEvaluationStatus": "not_started",
                "previousSkillGap": existing.get("skillGap", []),
                # Clean up current fields but KEEP them for new retest
                "overallVideoScore": 0,
                "detailedSkillGap": [],
                "skillGap": [],
                "eligibilitySignal": "-",
                "executiveSummary": "",
                "overallReasoning": "",
                "evaluatedAt": None,
                "videoAnswers": [],
                "competencyGapReport": "",
                "vibeCheck": "",
                "aiVerdict": "",
                "bridgeChecklistData": None,
                "retestMcqs": None,
                "retestQuestions": None
            },
            "$push": {
                "evaluationHistory": history_entry
            }
        }
    )
    return {"message": "Pass data archived. Ready to retest."}

@router.get("/dashboard-stats/{student_id}")
async def get_dashboard_stats(student_id: str):
    # Enrolled courses based on test results
    results = list(results_collection.find({"studentId": ObjectId(student_id)}).sort("timestamp", -1))
    
    enrolled_courses = []
    total_score = 0
    test_count = 0
    certificates = 0
    
    seen_courses = set()
    for r in results:
        course_id = str(r.get("courseId"))
        if course_id in seen_courses: continue
        seen_courses.add(course_id)
        
        # Simple progress logic
        status = r.get("status", "Pending")
        progress = 100 if status == "Approved" else (30 if status == "Pending" else (70 if "Bridge" in status else 50))
        
        enrolled_courses.append({
            "name": r.get("courseTitle", "Unknown Course"),
            "progress": progress,
            "status": status
        })
        
    # Stats across ALL attempts
    for r in results:
        if r.get("score"):
            total_score += r.get("score")
            test_count += 1
        if r.get("status") == "Approved":
            certificates += 1
            
    avg_score = round(total_score / test_count) if test_count > 0 else 0
    
    # Get latest recommendations and GAPS from results
    latest_result = None
    all_gaps = []
    recommendations = []
    
    # Sort results by timestamp (already done in query results = list(...))
    if results:
        latest_result = results[0]
        # Collect all unique gaps
        seen_gaps = set()
        for r in results:
            if r.get("skillGap"):
                for g in r.get("skillGap"):
                    if g not in seen_gaps:
                        all_gaps.append({
                           "id": str(r["_id"]),
                           "title": g,
                           "description": f"Identified in {r.get('courseTitle')} assessment"
                        })
                        seen_gaps.add(g)

        recommendations.append({
            "title": f"Focus on {latest_result.get('courseTitle')}",
            "description": latest_result.get("executiveSummary", "Take more assessments to get detailed recommendations.")
        })
        if latest_result.get("skillGap"):
            recommendations.append({
                "title": "Skill Improvement Needed",
                "description": f"Focusing on {', '.join(latest_result.get('skillGap')[:2])} will help you clear the assessment."
            })

    return {
        "enrolledCourses": enrolled_courses,
        "avgScore": avg_score,
        "testsTaken": test_count,
        "certificates": certificates,
        "recommendations": recommendations,
        "skillGaps": all_gaps[:3] # Show top 3
    }
