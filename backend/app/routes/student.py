from fastapi import APIRouter, HTTPException, status, File, UploadFile, Form, BackgroundTasks
from app.schemas.student import StudentCreate, StudentLogin, StudentProfile, StudentProfileUpdate, TestResult
from app.database.connection import db, students_collection, results_collection, courses_collection, video_questions_collection
from app.core.security import hash_password, verify_password
from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest
from app.services.email_service import send_reset_email
from app.services.ai_service import analyze_test_results
from app.services.cloudinary_service import upload_video
from app.services.transcription_service import transcribe_videos
import secrets
import re
import os
from datetime import datetime, timedelta
from bson import ObjectId
from typing import List

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
    from app.core.security import create_access_token
    access_token = create_access_token(data={"sub": str(student["_id"]), "role": student["role"]})
    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "role": student["role"],
        "student": {
            "id": str(student["_id"]),
            "email": student["email"],
            "firstName": student["firstName"],
            "lastName": student["lastName"],
        }
    }

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

@router.post("/submit-test")
async def submit_test(result: TestResult):
    result_dict = result.model_dump()
    result_dict["studentId"] = ObjectId(result.studentId)
    result_dict["courseId"] = ObjectId(result.courseId)
    result_dict["timestamp"] = datetime.utcnow()
    
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
            "videoTestEvaluationStatus": result.get("videoTestEvaluationStatus", "not_started")
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
        for file in files:
            # Clean public_id
            filename = file.filename or "unknown_file.mp4"
            public_id = re.sub(r'[^a-zA-Z0-9_-]', '_', filename.split('.')[0])
            
            # Read file content
            content = await file.read()
            if len(content) == 0:
                print(f"Warning: File {filename} is empty")
                errors.append(f"File {filename} is empty")
                continue

            # Upload to Cloudinary
            try:
                response = upload_video(content, folder_path, public_id)
                if response:
                    video_urls.append({
                        "question": public_id,
                        "url": response.get("secure_url")
                    })
            except Exception as upload_err:
                error_msg = str(upload_err)
                print(f"Upload failed for {filename}: {error_msg}")
                errors.append(f"{filename}: {error_msg}")
        
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
            "videoTestEvaluationStatus": "pending"
        }

        result = results_collection.find_one_and_update(
            {
                "studentId": ObjectId(studentId),
                "courseId": ObjectId(courseId)
            },
            {"$set": update_data},
            sort={"timestamp": -1}
        )

        if not result:
            # If no MCQ result found, create a new one? 
            # But normally there should be one.
            # For robustness, we could insert if needed, but let's stick to update as per user's "db also be updated".
            raise HTTPException(status_code=404, detail="Test result not found for this student and course")

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

        # 2. Fetch course details and video questions
        course = courses_collection.find_one({"_id": ObjectId(course_id)})
        video_questions_data = video_questions_collection.find_one({"courseId": ObjectId(course_id)})
        
        if not course or not video_questions_data:
            print("Course or video questions not found")
            return

        video_questions = video_questions_data.get("videoQuestions", [])
        
        # 3. Analyze each answer
        total_score = 0
        count = 0
        weak_skills = []
        
        updated_answers = []
        for q_answer in result["videoAnswers"]:
            question_id = q_answer.get("questionId") # e.g. "Q1"
            transcript = q_answer.get("transcript")
            
            # Map Q1 -> index 0
            try:
                # Extract number from Q1, Q2 etc.
                num_str = re.search(r'\d+', question_id).group()
                idx = int(num_str) - 1
                
                if idx < len(video_questions):
                    question_obj = video_questions[idx]
                else:
                    question_obj = question_id # Fallback
                
                if isinstance(question_obj, dict):
                    question_data = question_obj
                    related_skill = question_obj.get("relatedSkill", "General")
                else:
                    question_data = {"question": question_id, "relatedSkill": "General"}
                    related_skill = "General"
            except Exception as e:
                print(f"Index mapping error for {question_id}: {e}")
                question_data = {"question": question_id, "relatedSkill": "General"}
                related_skill = "General"

            # Call AI Evaluation
            from app.services.ai_service import evaluate_video_answer
            analysis = evaluate_video_answer(question_data, transcript, course)
            
            q_answer["analysis"] = analysis
            q_answer["relatedSkill"] = related_skill
            updated_answers.append(q_answer)
            
            # Update scoring
            score = analysis.get("technicalScore", 0)
            total_score += score
            count += 1
            
            # Skill Gap detection
            if score < 5:
                weak_skills.append(related_skill)

        # 4. Final results logic
        avg_score = total_score / count if count > 0 else 0
        unique_weak_skills = list(set([s for s in weak_skills if s != "General"]))
        
        # 4.1 Overall Performance Signal (AI-based)
        from app.services.ai_service import generate_overall_video_evaluation
        overall_eval = generate_overall_video_evaluation(updated_answers, course)

        # 5. Update DB
        results_collection.update_one(
            {"_id": result["_id"]},
            {"$set": {
                "videoAnswers": updated_answers,
                "overallVideoScore": avg_score,
                "skillGap": unique_weak_skills,
                "videoTestEvaluationStatus": "completed",
                "eligibilitySignal": overall_eval.get("overallEligibilitySignal"),
                "executiveSummary": overall_eval.get("executiveSummary"),
                "overallReasoning": overall_eval.get("overallReasoning"),
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
