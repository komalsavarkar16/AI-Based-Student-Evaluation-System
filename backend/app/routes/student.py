from fastapi import APIRouter, HTTPException, status, File, UploadFile, Form, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
from app.schemas.student import StudentCreate, StudentLogin, StudentProfile, StudentProfileUpdate, TestResult, StudentResponse, AIEvaluation, AdmissionsStatus, BridgeCurriculum
from app.database.connection import db, students_collection, courses_collection, video_questions_collection, responses_collection, ai_evaluations_collection, admissions_status_collection, bridge_curriculum_collection, settings_collection, announcements_collection
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
from app.core.dependencies import get_current_user

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
        # 7 days
        expiry_time = timedelta(days=7)
        max_age = 604800  # seconds (7 days)
    else:
        # 1 hour
        expiry_time = timedelta(hours=1)
        max_age = 3600  # seconds (1 hour)

    # Create the token
    access_token = create_access_token(
        data={"sub": str(student["_id"]), "role": student["role"]},
        expires_delta=expiry_time
    )

    # Prepare response data (Include access_token for header-based auth)
    content = {
        "message": "Login successful",
        "access_token": access_token,
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
        httponly=True,
        max_age=max_age,
        samesite="none",
        secure=True,
        path="/",
    )

    return response

@router.post("/logout")
async def logout_student():
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie("access_token")
    return response


@router.get("/profile/{student_id}", response_model=StudentProfile)
async def get_student_profile(student_id: str, current_user: dict = Depends(get_current_user)):
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
    student_id = ObjectId(result.studentId)
    course_id = ObjectId(result.courseId)
    timestamp = datetime.utcnow()
    
    # --- Normalized Implementation START ---
    
    # 0. Fetch details for notifications
    student = students_collection.find_one({"_id": student_id})
    student_name = f"{student.get('firstName', '')} {student.get('lastName', '')}" if student else f"Student {str(student_id)[-4:]}"
    course = courses_collection.find_one({"_id": course_id})
    course_title = course.get("title", result.courseTitle)
    
    # 1. Update Student Responses
    mcq_score = round(result.score, 2)
    response_data = {
        "studentId": student_id,
        "courseId": course_id,
        "mcqAnswers": result.answers,
        "mcqScore": mcq_score,
        "submittedAt": timestamp
    }
    
    responses_collection.update_one(
        {"studentId": student_id, "courseId": course_id},
        {"$set": response_data},
        upsert=True
    )
    
    # Get the response document ID
    response_doc = responses_collection.find_one({"studentId": student_id, "courseId": course_id})
    response_id = response_doc["_id"]
    
    # 2. Initial AI Analysis (if score < passing_score)
    settings = settings_collection.find_one({"type": "global_config"})
    passing_score = settings.get("passingScore", 70) if settings else 70

    analysis_content = None
    analysis = None
    if result.score < passing_score:
        analysis_content = analyze_test_results(result.answers, course_title)
        ai_eval_data = {
            "responseId": response_id,
            "studentId": student_id,
            "courseId": course_id,
            "scores": {"mcq": mcq_score},
            "executiveSummary": "MCQ results analyzed.",
            "skillGaps": analysis_content.get("weak_skills", []),
            "vibeCheck": "N/A",
            "aiVerdict": "Needs Improvement",
            "evaluatedAt": timestamp
        }
        ai_evaluations_collection.update_one(
            {"responseId": response_id},
            {"$set": ai_eval_data},
            upsert=True
        )
        analysis = analysis_content
        
    # 3. Initialize Admissions Status
    admissions_status_collection.update_one(
        {"responseId": response_id},
        {"$set": {
            "responseId": response_id,
            "studentId": student_id,
            "status": "Pending"
        }},
        upsert=True
    )

    # 4. Notify Student
    status_label = "Passed" if result.score >= passing_score else "Needs Improvement"
    st_msg = f"Assessment completion: You've completed the MCQ for '{course_title}'. Status: {status_label}."
    if result.score >= passing_score:
        st_msg += " Proceed to your video assessment."
    else:
        st_msg += " Review AI insights for areas of improvement."

    db.notifications.insert_one({
        "type": "mcq_completion",
        "studentId": student_id,
        "courseId": course_id,
        "courseTitle": course_title,
        "status": status_label,
        "score": mcq_score,
        "message": st_msg,
        "isRead": False,
        "timestamp": timestamp
    })
    
    # 5. Notify Admin
    db.notifications.insert_one({
        "type": "video_test_evaluation", # Using existing type for UI compatibility
        "studentId": student_id,
        "studentName": student_name,
        "courseId": course_id,
        "courseTitle": course_title,
        "message": f"A new evaluation is ready for {student_name} ({course_title}).",
        "status": "unread",
        "isRead": False,
        "timestamp": timestamp
    })
    
    # --- Normalized Implementation END ---
    
    return {
        "message": "Test results submitted successfully", 
        "score": result.score,
        "pass_status": result.score >= passing_score,
        "analysis": analysis
    }

@router.get("/check-test-status/{student_id}/{course_id}")
async def check_test_status(student_id: str, course_id: str):
    if not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail=f"'{student_id}' is not a valid student ID")
    if not ObjectId.is_valid(course_id):
        raise HTTPException(status_code=400, detail=f"'{course_id}' is not a valid course ID")
        
    try:
        # Check normalized data 
        response = responses_collection.find_one({
            "studentId": ObjectId(student_id),
            "courseId": ObjectId(course_id)
        }, sort=[("submittedAt", -1)])
        
        if not response:
            return {"completed": False, "passed": False, "score": 0}

        # Aggregate normalized data
        response_id = response["_id"]
        ai_eval = ai_evaluations_collection.find_one({"responseId": response_id}) or {}
        admission = admissions_status_collection.find_one({"responseId": response_id}) or {}
        bridge = bridge_curriculum_collection.find_one({"responseId": response_id}) or {}
        
        # Fetch settings for passing score verification
        settings = settings_collection.find_one({"type": "global_config"})
        passing_score = settings.get("passingScore", 70) if settings else 70
        
        # Merge into a unified response format
        return {
            "completed": True,
            "passed": response.get("mcqScore", 0) >= passing_score,
            "score": response.get("mcqScore", 0),
            "videoTestSubmittedAt": response.get("videoSubmittedAt"),
            "videoTestEvaluationStatus": "completed" if ai_eval.get("aiVerdict") else ("pending" if response.get("videoUrls") else "not_started"),
            "videoAnswers": response.get("videoAnswers", []),
            "overallVideoScore": ai_eval.get("scores", {}).get("overallVideo", 0),
            "skillGap": ai_eval.get("skillGaps", []),
            "detailedSkillGap": ai_eval.get("detailedSkillGap", []),
            "eligibilitySignal": ai_eval.get("eligibilitySignal", "-"),
            "executiveSummary": ai_eval.get("executiveSummary", ""),
            "overallReasoning": ai_eval.get("overallReasoning", ""),
            "status": admission.get("status", "Pending"),
            "decisionNotes": admission.get("decisionNotes", ""),
            "analysis": ai_eval.get("analysis", {}),
            "bridgeChecklistData": {
                "checklist": bridge.get("checklist", []),
                "references": bridge.get("references", [])
            } if bridge else None,
            "enrollmentLetter": admission.get("enrollmentLetter"),
            "instituteLogo": admission.get("instituteLogo"),
            "evaluationHistory": [] 
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
    if not ObjectId.is_valid(studentId):
        raise HTTPException(status_code=400, detail=f"'{studentId}' is not a valid student ID")
    if not ObjectId.is_valid(courseId):
        raise HTTPException(status_code=400, detail=f"'{courseId}' is not a valid course ID")
        
    try:
        # Sanitize course title for folder name
        safe_course_title = re.sub(r'[^a-zA-Z0-9_-]', '_', courseTitle)
        folder_path = f"student_videos/{safe_course_title}/student_{studentId}"
        
        file_data = []
        for file in files:
            content = await file.read()
            if len(content) > 0:
                filename = file.filename or "unknown_file.mp4"
                public_id = re.sub(r'[^a-zA-Z0-9_-]', '_', filename.split('.')[0])
                file_data.append((content, public_id, filename))

        if not file_data:
            raise HTTPException(status_code=400, detail="No valid video files uploaded.")

        import asyncio
        from concurrent.futures import ThreadPoolExecutor
        
        def upload_worker(data):
            content, pid, fname = data
            try:
                cloudinary_res = upload_video(content, folder_path, pid)
                if cloudinary_res:
                    return {"question": pid, "url": cloudinary_res.get("secure_url")}
            except:
                return None
            return None

        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as executor:
            upload_results = await asyncio.gather(*[
                loop.run_in_executor(executor, upload_worker, data) for data in file_data
            ])

        video_urls = [res for res in upload_results if res and "url" in res]
        if not video_urls:
            raise HTTPException(status_code=500, detail="Failed to upload videos.")

        # --- Normalized Logic ---
        responses_collection.update_one(
            {"studentId": ObjectId(studentId), "courseId": ObjectId(courseId)},
            {"$set": {
                "videoUrls": video_urls,
                "videoSubmittedAt": datetime.utcnow()
            }}
        )

        # Ensure status is updated from READY_FOR_RETEST to Pending
        response_doc = responses_collection.find_one({"studentId": ObjectId(studentId), "courseId": ObjectId(courseId)})
        if response_doc:
            admissions_status_collection.update_one(
                {"responseId": response_doc["_id"]},
                {"$set": {"status": "Pending"}}
            )

        background_tasks.add_task(transcribe_videos, studentId, courseId, video_urls)

        return {"message": "Video test submitted successfully.", "videoUrls": video_urls}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def process_video_test_analysis(student_id: str, course_id: str):
    try:
        # 1. Fetch the latest student response
        response = responses_collection.find_one({
            "studentId": ObjectId(student_id),
            "courseId": ObjectId(course_id)
        }, sort=[("submittedAt", -1)])
        
        if not response or "videoAnswers" not in response:
            print("No video answers found for analysis")
            return

        # 2. Identify which questions were used
        course = courses_collection.find_one({"_id": ObjectId(course_id)})
        
        # Check if it was a retest with dynamic questions
        admission = admissions_status_collection.find_one({"responseId": response["_id"]})
        if admission and "retestQuestions" in admission:
            active_questions = admission["retestQuestions"]
            print(f"Using dynamic retest questions for student {student_id}")
        else:
            video_questions_doc = video_questions_collection.find_one({"courseId": ObjectId(course_id)})
            active_questions = video_questions_doc.get("videoQuestions", []) if video_questions_doc else []
            print(f"Using standard course questions for student {student_id}")
        
        if not course:
            print("Course not found")
            return
        
        # 3. Analyze each answer
        total_score = 0
        count = 0
        updated_answers = []
        
        for q_answer in response.get("videoAnswers", []):
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

        # Fetch settings for weightages and passing score
        settings = settings_collection.find_one({"type": "global_config"})
        skill_threshold = settings.get("passingScore", 70) / 10 if settings else 7.0
        
        mcq_answers = response.get("mcqAnswers", [])
        detailed_skill_gaps = discover_skill_gaps(mcq_answers, updated_answers, course, threshold=skill_threshold)
        
        # Flatten the detailed categorical gaps 
        unique_weak_skills = []
        for cat in detailed_skill_gaps:
            for skill in cat.get("skills", []):
                if skill.get("isGap", False):
                    unique_weak_skills.append(skill.get("skillName"))
        unique_weak_skills = list(set([s for s in unique_weak_skills if s != "General"]))

        
        # 4.1 Overall Performance Signal (AI-based)
        overall_eval = generate_overall_video_evaluation(updated_answers, course)
        avg_score = round(total_score / count, 2) if count > 0 else 0

        # 5. Update DB (Normalized)
        response_id = response["_id"]
        
        ai_eval_data = {
            "responseId": response_id,
            "studentId": ObjectId(student_id),
            "courseId": ObjectId(course_id),
            "scores": {
                "mcq": response.get("mcqScore", 0),
                "overallVideo": avg_score
            },
            "executiveSummary": overall_eval.get("executiveSummary"),
            "skillGaps": unique_weak_skills,
            "vibeCheck": overall_eval.get("vibeCheck"),
            "aiVerdict": overall_eval.get("aiVerdict"),
            "eligibilitySignal": overall_eval.get("overallEligibilitySignal"),
            "overallReasoning": overall_eval.get("overallReasoning"),
            "competencyGapReport": overall_eval.get("competencyGap"),
            "detailedSkillGap": detailed_skill_gaps,
            "evaluatedAt": datetime.utcnow()
        }
        
        ai_evaluations_collection.update_one(
            {"responseId": response_id},
            {"$set": ai_eval_data},
            upsert=True
        )
        
        responses_collection.update_one(
            {"_id": response_id},
            {"$set": {"videoAnswers": updated_answers}}
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
            "isRead": False,
            "timestamp": datetime.utcnow()
        }
        
        # Insert into a notifications collection in the main db
        db.notifications.insert_one(notification)
        print("Admin notification created")
    except Exception as e:
        print(f"Failed to notify admin: {str(e)}")

@router.get("/notifications/{student_id}")
async def get_student_notifications(student_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail="Invalid student ID")
        
    sid = ObjectId(student_id)
    
    # 1. Fetch individual notifications
    notifications = list(db.notifications.find({
        "studentId": sid,
        "type": {"$in": ["admin_decision", "mcq_completion"]}
    }))
    
    # 1.1 Fetch read receipts for this student
    read_receipts = list(db.read_receipts.find({"studentId": sid}))
    read_item_ids = {str(r["itemId"]) for r in read_receipts}
    
    # 2. Fetch relevant announcements 
    # Get student's enrolled/attempted courses for targeting from NEW collection
    responses = list(responses_collection.find({"studentId": sid}, {"courseId": 1}))
    
    enrolled_course_ids = set()
    for r in responses:
        if r.get("courseId"): enrolled_course_ids.add(str(r["courseId"]))
        
    query = {
        "$or": [
            {"targetAudience": "all"},
            {"courseId": {"$in": list(enrolled_course_ids)}}
        ]
    }
    
    # Filter announcements by expiry
    announcements = list(announcements_collection.find(query))
    now = datetime.utcnow()
    
    results = []
    
    # Process notifications
    for n in notifications:
        n["_id"] = str(n["_id"])
        n["studentId"] = str(n["studentId"])
        if "courseId" in n and n["courseId"]:
            n["courseId"] = str(n["courseId"])
        
        # Override isRead if we have a receipt
        if n["_id"] in read_item_ids:
            n["isRead"] = True
            
        results.append(n)
        
    # Process announcements as notifications
    for a in announcements:
        # Check expiry
        if a.get("expiryDate"):
            try:
                expiry = datetime.fromisoformat(a["expiryDate"])
                if expiry <= now: continue
            except:
                pass
        
        results.append({
            "_id": str(a["_id"]),
            "type": "announcement",
            "studentId": student_id,
            "courseTitle": "General Announcement" if a["targetAudience"] == "all" else "Course Announcement",
            "message": a["message"],
            "title": a["title"],
            "isRead": str(a["_id"]) in read_item_ids, 
            "timestamp": a["createdAt"]
        })
        
    # 3. Sort by timestamp descending
    results.sort(key=lambda x: x["timestamp"] if isinstance(x["timestamp"], datetime) else datetime.fromisoformat(x["timestamp"]) if isinstance(x["timestamp"], str) else datetime.min, reverse=True)
        
    return results

@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, student_id: str = None):
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status_code=400, detail="Invalid notification ID")
        
    nid = ObjectId(notification_id)
    sid = None
    if student_id and ObjectId.is_valid(student_id):
        sid = ObjectId(student_id)

    # 1. Try to update in main notifications collection
    result = db.notifications.update_one(
        {"_id": nid},
        {"$set": {"isRead": True}}
    )
    
    # 2. If not found or if it's an announcement, we need a read receipt
    if result.matched_count == 0:
        # Check if it exists in announcements
        is_announcement = announcements_collection.find_one({"_id": nid})
        
        if is_announcement:
            if not sid:
                raise HTTPException(status_code=400, detail="Student ID required for announcements")
            
            # Record the read receipt
            db.read_receipts.update_one(
                {"studentId": sid, "itemId": nid},
                {"$set": {"readAt": datetime.utcnow()}},
                upsert=True
            )
            return {"message": "Announcement marked as read"}
        else:
            raise HTTPException(status_code=404, detail="Notification not found")
        
    # Also record a receipt for personal notifications to be safe/consistent
    if sid:
        db.read_receipts.update_one(
            {"studentId": sid, "itemId": nid},
            {"$set": {"readAt": datetime.utcnow()}},
            upsert=True
        )
        
    return {"message": "Notification marked as read"}

@router.put("/notifications/{student_id}/read-all")
async def mark_all_notifications_read(student_id: str):
    if not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail="Invalid student ID")
        
    sid = ObjectId(student_id)
    now = datetime.utcnow()

    # 1. Mark all personal notifications as read
    db.notifications.update_many(
        {"studentId": sid, "isRead": False},
        {"$set": {"isRead": True}}
    )

    # 2. Get all targetable announcements for this student to create receipts
    responses = list(responses_collection.find({"studentId": sid}, {"courseId": 1}))
    
    enrolled_course_ids = set()
    for r in responses:
        if r.get("courseId"): enrolled_course_ids.add(r["courseId"])
        
    query = {
        "$or": [
            {"targetAudience": "all"},
            {"courseId": {"$in": list(enrolled_course_ids)}}
        ]
    }
    
    # Only active announcements
    announcements = list(announcements_collection.find(query))
    active_announcement_ids = []
    for a in announcements:
        if a.get("expiryDate"):
            try:
                expiry = datetime.fromisoformat(a["expiryDate"])
                if expiry <= now: continue
            except:
                pass
        active_announcement_ids.append(a["_id"])

    # 3. Create/Update read receipts for all these announcements
    if active_announcement_ids:
        for aid in active_announcement_ids:
            db.read_receipts.update_one(
                {"studentId": sid, "itemId": aid},
                {"$set": {"readAt": now}},
                upsert=True
            )

    return {"message": "All notifications marked as read"}

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
    if not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail=f"'{student_id}' is not a valid student ID")
    if not ObjectId.is_valid(course_id):
        raise HTTPException(status_code=400, detail=f"'{course_id}' is not a valid course ID")
        
    response = responses_collection.find_one({
        "studentId": ObjectId(student_id),
        "courseId": ObjectId(course_id)
    }, sort=[("submittedAt", -1)])
    
    if not response:
        raise HTTPException(status_code=404, detail="Response not found")
        
    # Skill gaps are in ai_evaluations
    ai_eval = ai_evaluations_collection.find_one({"responseId": response["_id"]})
    skill_gaps = ai_eval.get("skillGaps", []) if ai_eval else []
    
    # Generate content
    checklist_data = generate_bridge_path_b_content(skill_gaps)
    
    # Store in bridge_curriculum_collection
    bridge_curriculum_collection.update_one(
        {"studentId": ObjectId(student_id), "courseId": ObjectId(course_id)},
        {"$set": {
            "responseId": response["_id"],
            "studentId": ObjectId(student_id),
            "courseId": ObjectId(course_id),
            "checklist": checklist_data.get("checklist", []),
            "references": checklist_data.get("references", []),
            "isActive": True,
            "generatedAt": datetime.utcnow()
        }},
        upsert=True
    )

    admissions_status_collection.update_one(
        {"responseId": response["_id"]},
        {"$set": {
            "status": "Bridge Course In Progress",
            "decidedAt": datetime.utcnow()
        }}
    )

    return {"message": "Bridge course started", "data": checklist_data}

class CheckListUpdateRequest(BaseModel):
    checklistData: dict

@router.post("/update-bridge-checklist/{student_id}/{course_id}")
async def update_bridge_checklist(student_id: str, course_id: str, request: CheckListUpdateRequest):
    # Normalized Update
    bridge_curriculum_collection.update_one(
        {"studentId": ObjectId(student_id), "courseId": ObjectId(course_id)},
        {"$set": {"checklist": request.checklistData.get("checklist", [])}}
    )
    return {"message": "Updated"}
    

@router.post("/finish-bridge-course/{student_id}/{course_id}")
async def finish_bridge_course(student_id: str, course_id: str):
    sid = ObjectId(student_id)
    cid = ObjectId(course_id)
    
    # Normalized Logic
    bridge_curriculum_collection.update_one(
        {"studentId": sid, "courseId": cid},
        {"$set": {"isActive": False}}
    )
    
    response_doc = responses_collection.find_one({"studentId": sid, "courseId": cid}, sort=[("submittedAt", -1)])
    if response_doc:
        admissions_status_collection.update_one(
            {"responseId": response_doc["_id"]},
            {"$set": {"status": "READY_FOR_RETEST", "decidedAt": datetime.utcnow()}}
        )

    return {"message": "Bridge course finished. Ready for retest."}
    

@router.get("/dashboard-stats/{student_id}")
async def get_dashboard_stats(student_id: str, current_user: dict = Depends(get_current_user)):
    sid = ObjectId(student_id)
    
    # 1. New Normalized Aggregation
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
    
    enrolled_courses = []
    total_score = 0
    test_count = 0
    certificates = 0
    all_gaps = []
    recommendations = []
    seen_courses = set()

    # Process Normalized
    for item in normalized_attempts:
        cid = item.get("courseId")
        course_id_str = str(cid)
        if course_id_str in seen_courses: continue
        seen_courses.add(course_id_str)
        
        # Fetch actual course title
        course = courses_collection.find_one({"_id": cid})
        course_title = course.get("title") if course else "Unknown Assessment"
        
        status = item.get("admission", {}).get("status", "Pending")
        progress = 100 if status == "Approved" else (30 if status == "Pending" else (70 if "Bridge" in status else 50))
        
        enrolled_courses.append({
            "name": course_title,
            "progress": progress,
            "status": status
        })
        
        # Stats
        mcq = item.get("mcqScore", 0)
        total_score += mcq
        test_count += 1
        if status == "Approved": certificates += 1
        
        # Gaps
        if item.get("ai_eval"):
            gaps = item["ai_eval"].get("skillGaps", [])
            for g in gaps:
                all_gaps.append({
                    "id": f"{str(item['_id'])}_{g}",
                    "title": g,
                    "description": f"Identified in {course_title}"
                })

    avg_score = round(total_score / test_count, 2) if test_count > 0 else 0
    
    # Simple recommendation based on latest gap
    if all_gaps:
        recommendations.append({
            "id": f"rec_{all_gaps[0]['id']}",
            "title": "Skill Improvement Needed",
            "description": f"Focusing on {all_gaps[0]['title']} will help you clear the assessment."
        })

    return {
        "enrolledCourses": enrolled_courses,
        "avgScore": avg_score,
        "testsTaken": test_count,
        "certificates": certificates,
        "recommendations": recommendations,
        "skillGaps": all_gaps[:3]
    }

@router.get("/announcements/{student_id}")
async def get_student_announcements(student_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(student_id):
        raise HTTPException(status_code=400, detail="Invalid student ID")
        
    sid = ObjectId(student_id)
    
    # 1. Get student's enrolled/attempted courses
    # Normalized
    responses = list(responses_collection.find({"studentId": sid}, {"courseId": 1}))
    
    enrolled_course_ids = set()
    for r in responses:
        if r.get("courseId"): enrolled_course_ids.add(str(r["courseId"]))
        
    # 2. Fetch announcements
    query = {
        "$or": [
            {"targetAudience": "all"},
            {"courseId": {"$in": list(enrolled_course_ids)}}
        ]
    }
    
    announcements = list(announcements_collection.find(query).sort("createdAt", -1))
    
    # 3. Filter and process
    now = datetime.utcnow()
    results = []
    
    for a in announcements:
        # Check expiry
        if a.get("expiryDate"):
            try:
                expiry = datetime.fromisoformat(a["expiryDate"])
                if expiry <= now: continue
            except:
                pass # Keep if parsing fails (flexible)
        
        a["id"] = str(a.pop("_id"))
        if "courseId" in a and a["courseId"]:
            a["courseId"] = str(a["courseId"])
            
        results.append(a)
        
    return results
    
@router.get("/all-results/{student_id}")
async def get_all_student_results(student_id: str, current_user: dict = Depends(get_current_user)):
    try:
        sid = ObjectId(student_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid Student ID format")

    student = students_collection.find_one({"_id": sid})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # Security: In a full implementation, check if current_user.id == sid
    
    student["id"] = str(student.pop("_id"))
    
    # --- Aggregate Evaluation History ---
    all_evaluations = []
    course_titles = {}

    # 1. New Normalized Data
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
            "enrollmentLetter": item.get("admission", {}).get("enrollmentLetter", "") if item.get("admission") else "",
            "instituteLogo": item.get("admission", {}).get("instituteLogo", "") if item.get("admission") else ""
        })


    all_evaluations.sort(key=lambda x: x.get("timestamp") or "", reverse=True)

    return {
        "profile": {
            "firstName": student.get("firstName", ""),
            "lastName": student.get("lastName", ""),
            "email": student.get("email", "")
        },
        "results": all_evaluations
    }
