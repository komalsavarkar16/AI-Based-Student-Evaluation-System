from fastapi import APIRouter, HTTPException
from bson import ObjectId
from datetime import datetime
from app.database.connection import courses_collection, mcq_collection
from app.services.ai_service import generate_mcqs

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
    mcq_collection.insert_one({
        "courseId": ObjectId(course_id),
        "courseTitle": course.get("title"),
        "mcqs": generated_mcqs,
        "createdAt": datetime.utcnow()
    })

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

    mcq["_id"] = str(mcq["_id"])
    mcq["courseId"] = str(mcq["courseId"])

    return mcq