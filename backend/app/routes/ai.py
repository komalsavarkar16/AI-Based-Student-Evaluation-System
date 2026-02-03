from fastapi import APIRouter, HTTPException
from bson import ObjectId
from datetime import datetime
from app.database.connection import courses_collection, mcq_collection, video_questions_collection
from app.services.ai_service import generate_mcqs, generate_video_questions

router = APIRouter(prefix="/ai", tags=["AI"])

@router.post("/generate/mcq/{course_id}")
def generate_mcq(course_id: str):
    course = courses_collection.find_one({"_id": ObjectId(course_id)})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    try:
        generated_mcqs = generate_mcqs(course)
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
def get_mcq(course_id: str):
    mcq = mcq_collection.find_one({"courseId": ObjectId(course_id)})

    if not mcq:
        raise HTTPException(status_code=404, detail="MCQs not found")

    if "courseTitle" not in mcq:
        course = courses_collection.find_one({"_id": mcq["courseId"]})
        if course:
            mcq["courseTitle"] = course.get("title", "Assessment")
        else:
            mcq["courseTitle"] = "Assessment"

    mcq["_id"] = str(mcq["_id"])
    mcq["courseId"] = str(mcq["courseId"])

    return mcq

@router.post("/generate/video-questions/{course_id}")
def generate_video_questions_route(course_id:str):
    course = courses_collection.find_one({"_id":ObjectId(course_id)})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    try:
        generated_video_questions = generate_video_questions(course)
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
def get_video_questions(course_id: str):
    video_questions = video_questions_collection.find_one({"courseId": ObjectId(course_id)})

    if not video_questions:
        raise HTTPException(status_code=404, detail="Video questions not found")

    if "courseTitle" not in video_questions:
        course = courses_collection.find_one({"_id": video_questions["courseId"]})
        if course:
            video_questions["courseTitle"] = course.get("title", "Assessment")
        else:
            video_questions["courseTitle"] = "Assessment"

    video_questions["_id"] = str(video_questions["_id"])
    video_questions["courseId"] = str(video_questions["courseId"])

    return video_questions

    