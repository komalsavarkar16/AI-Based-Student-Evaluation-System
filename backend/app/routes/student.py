from fastapi import APIRouter, HTTPException, status, File, UploadFile, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from app.schemas.student import StudentCreate, StudentLogin, StudentProfile, StudentProfileUpdate, TestResult, StudentResponse, AIEvaluation, AdmissionsStatus, BridgeCurriculum
from app.database.connection import db, students_collection, results_collection, courses_collection, video_questions_collection, responses_collection, ai_evaluations_collection, admissions_status_collection, bridge_curriculum_collection
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
    student_id = ObjectId(result.studentId)
    course_id = ObjectId(result.courseId)
    timestamp = datetime.utcnow()
    
    # --- Normalized Implementation START ---
    
    # 1. Update Student Responses
    response_data = {
        "studentId": student_id,
        "courseId": course_id,
        "mcqAnswers": result.answers,
        "mcqScore": result.score,
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
    
    # 2. Initial AI Analysis (if score < 70)
    analysis = None
    if result.score < 70:
        analysis_content = analyze_test_results(result.answers, result.courseTitle)
        ai_eval_data = {
            "responseId": response_id,
            "studentId": student_id,
            "courseId": course_id,
            "scores": {"mcq": result.score},
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
    
    # --- Normalized Implementation END ---

    # Old results_collection logic (backward compatibility)
    result_dict = result.model_dump()
    result_dict["studentId"] = student_id
    result_dict["courseId"] = course_id
    result_dict["timestamp"] = timestamp
    
    existing_result = results_collection.find_one(
        {"studentId": student_id, "courseId": course_id},
        sort=[("timestamp", -1)]
    )

    if existing_result:
        results_collection.update_one(
            {"_id": existing_result["_id"]},
            {"$set": {
                "score": result.score,
                "totalQuestions": result.totalQuestions,
                "correctAnswers": result.correctAnswers,
                "answers": result.answers,
                "courseTitle": result.courseTitle,
                "status": "Pending",
                "timestamp": timestamp
            }}
        )
    else:
        results_collection.insert_one(result_dict)
    
    return {
        "message": "Test results submitted successfully", 
        "score": result.score,
        "pass_status": result.score >= 70,
        "analysis": analysis
    }

@router.get("/check-test-status/{student_id}/{course_id}")
async def check_test_status(student_id: str, course_id: str):
    try:
        # Check normalized data first
        response = responses_collection.find_one({
            "studentId": ObjectId(student_id),
            "courseId": ObjectId(course_id)
        }, sort=[("submittedAt", -1)])
        
        # If no normalized response, check old results collection
        if not response:
            result = results_collection.find_one({
                "studentId": ObjectId(student_id),
                "courseId": ObjectId(course_id)
            }, sort={"timestamp": -1})
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

        # Aggregate normalized data
        response_id = response["_id"]
        ai_eval = ai_evaluations_collection.find_one({"responseId": response_id}) or {}
        admission = admissions_status_collection.find_one({"responseId": response_id}) or {}
        bridge = bridge_curriculum_collection.find_one({"responseId": response_id}) or {}
        
        # Merge into a unified response format
        return {
            "completed": True,
            "passed": response.get("mcqScore", 0) >= 70,
            "score": response.get("mcqScore", 0),
            "videoTestSubmittedAt": response.get("videoSubmittedAt"),
            "videoTestEvaluationStatus": "completed" if ai_eval.get("aiVerdict") else ("pending" if response.get("videoUrls") else "not_started"),
            "videoAnswers": response.get("videoAnswers", []),
            "overallVideoScore": ai_eval.get("scores", {}).get("overallVideo", 0),
            "skillGap": ai_eval.get("skillGaps", []),
            "detailedSkillGap": ai_eval.get("detailedSkillGap", []), # Placeholder for new categorical gaps
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
            "evaluationHistory": [] # History will be moved to separate collection later
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

        # Legacy Support
        results_collection.update_one(
            {"studentId": ObjectId(studentId), "courseId": ObjectId(courseId)},
            {"$set": {
                "videoUrls": video_urls,
                "videoTestSubmittedAt": datetime.utcnow().strftime("%Y-%m-%d"),
                "videoTestEvaluationStatus": "pending",
                "status": "Pending",
                "timestamp": datetime.utcnow()
            }}
        )

        background_tasks.add_task(transcribe_videos, studentId, courseId, video_urls)

        return {"message": "Video test submitted successfully.", "videoUrls": video_urls}
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
        
        # Normalized Implementation
        response_doc = responses_collection.find_one({"studentId": ObjectId(student_id), "courseId": ObjectId(course_id)})
        response_id = response_doc["_id"] if response_doc else None
        
        ai_eval_data = {
            "responseId": response_id,
            "studentId": ObjectId(student_id),
            "courseId": ObjectId(course_id),
            "scores": {
                "mcq": result.get("score", 0),
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
            {"studentId": ObjectId(student_id), "courseId": ObjectId(course_id)},
            {"$set": ai_eval_data},
            upsert=True
        )
        
        responses_collection.update_one(
            {"studentId": ObjectId(student_id), "courseId": ObjectId(course_id)},
            {"$set": {"videoAnswers": updated_answers}}
        )

        # Legacy Update
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
        
    # Normalized Implementation
    response_doc = responses_collection.find_one({"studentId": ObjectId(student_id), "courseId": ObjectId(course_id)}, sort=[("submittedAt", -1)])
    response_id = response_doc["_id"] if response_doc else None
    
    bridge_curriculum_collection.update_one(
        {"studentId": ObjectId(student_id), "courseId": ObjectId(course_id)},
        {"$set": {
            "responseId": response_id,
            "studentId": ObjectId(student_id),
            "courseId": ObjectId(course_id),
            "roadmap": checklist_data.get("roadmap", []),
            "checklist": checklist_data.get("checklist", []),
            "isActive": True
        }},
        upsert=True
    )

    # Legacy Implementation
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
    # Normalized Update
    bridge_curriculum_collection.update_one(
        {"studentId": ObjectId(student_id), "courseId": ObjectId(course_id)},
        {"$set": {"checklist": request.checklistData.get("checklist", [])}}
    )

    # Legacy Update
    results_collection.update_one(
        {"studentId": ObjectId(student_id), "courseId": ObjectId(course_id)},
        {"$set": {"bridgeChecklistData": request.checklistData}}
    )
    return {"message": "Updated"}
    

@router.post("/finish-bridge-course/{student_id}/{course_id}")
async def finish_bridge_course(student_id: str, course_id: str):
    sid = ObjectId(student_id)
    cid = ObjectId(course_id)
    
    # Fetch existing to archive it
    existing = results_collection.find_one({"studentId": sid, "courseId": cid}, sort=[("timestamp", -1)])
    if not existing:
        raise HTTPException(status_code=404, detail="Test results not found")

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

    # Prepare historical entry (Legacy)
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

    # Legacy Update
    results_collection.update_many(
        {"studentId": sid, "courseId": cid},
        {
            "$set": {
                "status": "READY_FOR_RETEST",
                "videoTestEvaluationStatus": "not_started",
                # ... other resets ...
            },
            "$push": {"evaluationHistory": {k: v for k, v in history_entry.items() if v is not None}}
        }
    )
    return {"message": "Pass data archived. Ready to retest."}
    

@router.get("/dashboard-stats/{student_id}")
async def get_dashboard_stats(student_id: str):
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
    
    # 2. Legacy Results
    legacy_results = list(results_collection.find({"studentId": sid}).sort("timestamp", -1))
    
    enrolled_courses = []
    total_score = 0
    test_count = 0
    certificates = 0
    all_gaps = []
    recommendations = []
    seen_courses = set()

    # Process Normalized first
    for item in normalized_attempts:
        course_id = str(item.get("courseId"))
        if course_id in seen_courses: continue
        seen_courses.add(course_id)
        
        status = item.get("admission", {}).get("status", "Pending")
        progress = 100 if status == "Approved" else (30 if status == "Pending" else (70 if "Bridge" in status else 50))
        
        enrolled_courses.append({
            "name": "Assessment", # Placeholder
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
                    "id": str(item["_id"]),
                    "title": g,
                    "description": "Identified in latest assessment"
                })

    # Process Legacy (only for courses NOT in normalized yet)
    for r in legacy_results:
        course_id = str(r.get("courseId"))
        if course_id in seen_courses: continue
        seen_courses.add(course_id)
        
        status = r.get("status", "Pending")
        progress = 100 if status == "Approved" else (30 if status == "Pending" else (70 if "Bridge" in status else 50))
        
        enrolled_courses.append({
            "name": r.get("courseTitle", "Unknown Course"),
            "progress": progress,
            "status": status
        })
        
        if r.get("score"):
            total_score += r.get("score")
            test_count += 1
        if status == "Approved":
            certificates += 1
            
        if r.get("skillGap"):
            for g in r.get("skillGap"):
                all_gaps.append({
                    "id": str(r["_id"]),
                    "title": g,
                    "description": f"Identified in {r.get('courseTitle')} assessment"
                })

    avg_score = round(total_score / test_count) if test_count > 0 else 0
    
    # Simple recommendation based on latest gap
    if all_gaps:
        recommendations.append({
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
    
