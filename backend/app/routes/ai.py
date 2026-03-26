from fastapi import APIRouter, HTTPException, Query
from bson import ObjectId
from datetime import datetime
from app.database.connection import courses_collection, mcq_collection, video_questions_collection, results_collection, settings_collection
from app.services.ai_service import generate_mcqs, generate_video_questions, generate_retest_video_questions, generate_retest_mcqs

router = APIRouter(prefix="/ai", tags=["AI"])

@router.post("/generate/mcq/{course_id}")
def generate_mcq(course_id: str):
    course = courses_collection.find_one({"_id": ObjectId(course_id)})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    try:
        # Fetch settings for dynamic count
        settings = settings_collection.find_one({"type": "global_config"})
        mcq_count = settings.get("mcqCount", 10) if settings else 10
        
        generated_mcqs = generate_mcqs(course, count=mcq_count)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI generation failed: {str(e)}"
        )
    
    # Ensure no duplicates by removing existing ones first
    mcq_collection.delete_many({"courseId": ObjectId(course_id)})
    
    mcq_collection.update_one(
        {"courseId": ObjectId(course_id)},
        {"$set": {
            "courseTitle": course.get("title"),
            "mcqs": generated_mcqs,
            "updatedAt": datetime.utcnow()
        }},
        upsert=True
    )

    courses_collection.update_one(
        {"_id": ObjectId(course_id)},
        {"$set": {"aiStatus.mcqGenerated": True}}
    )

    return {"message": "MCQs generated successfully", "mcqs": generated_mcqs}

@router.get("/get/mcq/{course_id}")
def get_mcq(course_id: str, student_id: str = Query(None)):
    # 1. Check if this is a dynamic retest for a specific student
    print(f"DEBUG: get_mcq course_id={course_id} student_id={student_id}")
    if student_id and ObjectId.is_valid(student_id):
        result = results_collection.find_one({
            "studentId": ObjectId(student_id),
            "courseId": ObjectId(course_id)
        }, sort=[("timestamp", -1)])
        
        if result:
            print(f"DEBUG: result found status={result.get('status')} prevGaps={result.get('previousSkillGap')}")
        else:
            print(f"DEBUG: result NOT found")

        # If student is in READY_FOR_RETEST, generate dynamic questions
        if result and result.get("status") == "READY_FOR_RETEST":
            course = courses_collection.find_one({"_id": ObjectId(course_id)})
            if course:
                try:
                    # Check if we already generated retest MCQs
                    if "retestMcqs" in result:
                        return {
                            "mcqs": result["retestMcqs"],
                            "courseTitle": course.get("title", "Retest Assessment"),
                            "isRetest": True
                        }
                    
                    # Fallback for gaps: use previous ones or course skills
                    gaps = result.get("previousSkillGap")
                    if not gaps:
                        gaps = course.get("skills_required", [])
                    
                    # Fetch settings for retest count
                    settings = settings_collection.find_one({"type": "global_config"})
                    mcq_count = settings.get("mcqCount", 10) if settings else 10
                    
                    dynamic_mcqs = generate_retest_mcqs(course, gaps, count=mcq_count)
                    
                    results_collection.update_one(
                        {"_id": result["_id"]},
                        {"$set": {"retestMcqs": dynamic_mcqs}}
                    )
                    
                    return {
                        "mcqs": dynamic_mcqs,
                        "courseTitle": course.get("title", "Retest Assessment"),
                        "isRetest": True
                    }
                except Exception as e:
                    print(f"Dynamic assessment fallback: {e}")

    # Default logic (Same questions)
    mcq = mcq_collection.find_one({"courseId": ObjectId(course_id)})

    if not mcq:
        raise HTTPException(status_code=404, detail="MCQs not found")

    course_title = mcq.get("courseTitle")
    if not course_title:
        course = courses_collection.find_one({"_id": mcq["courseId"]})
        course_title = course.get("title", "Assessment") if course else "Assessment"

    return {
        "mcqs": mcq.get("mcqs", []),
        "courseTitle": course_title,
        "isRetest": False
    }

@router.post("/generate/video-questions/{course_id}")
def generate_video_questions_route(course_id:str):
    course = courses_collection.find_one({"_id":ObjectId(course_id)})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    try:
        # Fetch settings for dynamic count
        settings = settings_collection.find_one({"type": "global_config"})
        video_count = settings.get("videoCount", 6) if settings else 6
        
        generated_video_questions = generate_video_questions(course, count=video_count)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI generation failed: {str(e)}"
        )
    
    # Clean up any existing duplicate records first
    video_questions_collection.delete_many({"courseId": ObjectId(course_id)})

    video_questions_collection.update_one(
        {"courseId": ObjectId(course_id)},
        {"$set": {
            "courseTitle": course.get("title"),
            "videoQuestions": generated_video_questions,
            "updatedAt": datetime.utcnow()
        }},
        upsert=True
    )
    

    courses_collection.update_one(
        {"_id": ObjectId(course_id)},
        {"$set": {"aiStatus.videoQuestionsGenerated": True}}
    )

    return {"message": "Video questions generated successfully", "videoQuestions": generated_video_questions}

@router.get("/get/video-questions/{course_id}")
def get_video_questions(course_id: str, student_id: str = Query(None)):
    # 1. Check if this is a dynamic retest for a specific student
    print(f"DEBUG: get_video_questions course_id={course_id} student_id={student_id}")
    if student_id and ObjectId.is_valid(student_id):
        result = results_collection.find_one({
            "studentId": ObjectId(student_id),
            "courseId": ObjectId(course_id)
        }, sort=[("timestamp", -1)])
        
        if result:
            print(f"DEBUG: result found status={result.get('status')} prevGaps={result.get('previousSkillGap')}")
        else:
            print(f"DEBUG: result NOT found")

        # If student is in READY_FOR_RETEST, generate dynamic questions
        if result and result.get("status") == "READY_FOR_RETEST":
            course = courses_collection.find_one({"_id": ObjectId(course_id)})
            if course:
                try:
                    # Check if we already generated retest questions
                    if "retestQuestions" in result:
                        print("DEBUG: returning cached retestQuestions")
                        return {
                            "videoQuestions": result["retestQuestions"],
                            "courseTitle": course.get("title", "Retest Assessment"),
                            "isRetest": True
                        }
                    
                    # Fallback for gaps: use previous ones or course skills
                    gaps = result.get("previousSkillGap")
                    if not gaps:
                        gaps = course.get("skills_required", [])
                    
                    # Fetch settings for retest count
                    settings = settings_collection.find_one({"type": "global_config"})
                    video_count = settings.get("videoCount", 6) if settings else 6
                    
                    print(f"DEBUG: generating retest video questions for gaps={gaps}")
                    dynamic_questions = generate_retest_video_questions(course, gaps, count=video_count)
                    
                    # Store these questions in the result
                    results_collection.update_one(
                        {"_id": result["_id"]},
                        {"$set": {"retestQuestions": dynamic_questions}}
                    )
                    
                    return {
                        "videoQuestions": dynamic_questions,
                        "courseTitle": course.get("title", "Retest Assessment"),
                        "isRetest": True
                    }
                except Exception as e:
                    print(f"Dynamic assessment fallback: {e}")

    # Default: Return standard course questions (Same questions)
    video_questions = video_questions_collection.find_one({"courseId": ObjectId(course_id)})

    if not video_questions:
        raise HTTPException(status_code=404, detail="Video questions not found")

    course_title = video_questions.get("courseTitle")
    if not course_title:
        course = courses_collection.find_one({"_id": video_questions["courseId"]})
        course_title = course.get("title", "Assessment") if course else "Assessment"

    return {
        "videoQuestions": video_questions.get("videoQuestions", []),
        "courseTitle": course_title,
        "isRetest": False
    }

    