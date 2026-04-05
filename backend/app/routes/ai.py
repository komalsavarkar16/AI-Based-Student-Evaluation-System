from fastapi import APIRouter, HTTPException, Query
from bson import ObjectId
from datetime import datetime
from app.database.connection import courses_collection, mcq_collection, video_questions_collection, settings_collection, admissions_status_collection, responses_collection, ai_evaluations_collection
from app.services.ai_service import generate_mcqs, generate_video_questions, generate_retest_video_questions

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
    print(f"DEBUG: get_mcq course_id={course_id} student_id={student_id}")

    if not ObjectId.is_valid(course_id):
        raise HTTPException(status_code=400, detail=f"'{course_id}' is not a valid ObjectId")

    # Check if student already completed this test
    if student_id and ObjectId.is_valid(student_id):
        existing_response = responses_collection.find_one({
            "studentId": ObjectId(student_id),
            "courseId": ObjectId(course_id)
        })
        if existing_response:
            # Check passing score
            settings = settings_collection.find_one({"type": "global_config"})
            passing_score = settings.get("passingScore", 70) if settings else 70
            if existing_response.get("mcqScore", 0) < passing_score:
                raise HTTPException(status_code=403, detail="Assessment already completed with 'Needs Improvement' status. Retakes are not permitted.")

    # Default logic (Same questions)
    mcq = mcq_collection.find_one({"courseId": ObjectId(course_id)})

    if not mcq:
        raise HTTPException(status_code=404, detail="MCQs not found")

    course_title = mcq.get("courseTitle")
    if not course_title:
        course = courses_collection.find_one({"_id": mcq["courseId"]})
        course_title = course.get("title", "Assessment") if course else "Assessment"

    return {
        "courseId": course_id,
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
    print(f"DEBUG: get_video_questions course_id={course_id} student_id={student_id}")

    if not ObjectId.is_valid(course_id):
        raise HTTPException(status_code=400, detail=f"'{course_id}' is not a valid ObjectId")

    if student_id and ObjectId.is_valid(student_id):
        sid = ObjectId(student_id)
        cid = ObjectId(course_id)
        
        # 1. Fetch Latest Response and Its Status
        response = responses_collection.find_one({"studentId": sid, "courseId": cid}, sort=[("submittedAt", -1)])
        if response:
            rid = response["_id"]
            admission = admissions_status_collection.find_one({"responseId": rid})
            
            # If student is in READY_FOR_RETEST, generate dynamic questions
            if admission and admission.get("status") == "READY_FOR_RETEST":
                course = courses_collection.find_one({"_id": cid})
                if course:
                    try:
                        # Check if we already generated retest questions
                        if "retestQuestions" in admission and admission["retestQuestions"]:
                            return {
                                "courseId": course_id,
                                "videoQuestions": admission["retestQuestions"],
                                "courseTitle": course.get("title", "Retest Assessment"),
                                "isRetest": True
                            }
                        
                        # Fetch skill gaps from AI evaluation
                        ai_eval = ai_evaluations_collection.find_one({"responseId": rid})
                        gaps = ai_eval.get("skillGaps", []) if ai_eval else []
                        
                        if not gaps:
                            gaps = course.get("skills_required", [])
                        
                        # Fetch settings for retest count
                        settings = settings_collection.find_one({"type": "global_config"})
                        video_count = settings.get("videoCount", 6) if settings else 6
                        
                        # PRIORITY: Check if we have manual questions that match the gaps
                        video_questions_doc = video_questions_collection.find_one({"courseId": cid})
                        manual_relevant = []
                        if video_questions_doc:
                            std_questions = video_questions_doc.get("videoQuestions", [])
                            # Find manual questions that match the gaps
                            manual_relevant = [q for q in std_questions if q.get("relatedSkill") in gaps]
                        
                        # Generate dynamic questions
                        dynamic_questions = generate_retest_video_questions(course, gaps, count=video_count)
                        
                        # Combine: Use manual relevant first, then dynamic
                        pool = manual_relevant + dynamic_questions
                        # Limit to video_count
                        final_retest_questions = pool[:video_count] if len(pool) > video_count else pool
                        
                        # Store in admission status
                        admissions_status_collection.update_one(
                            {"_id": admission["_id"]},
                            {"$set": {"retestQuestions": final_retest_questions}}
                        )
                        
                        return {
                            "courseId": course_id,
                            "videoQuestions": final_retest_questions,
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
        "courseId": course_id,
        "videoQuestions": video_questions.get("videoQuestions", []),
        "courseTitle": course_title,
        "isRetest": False
    }

    