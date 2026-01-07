from fastapi import APIRouter, HTTPException
from app.database.connection import courses_collection
from app.schemas.courses import CourseCreate
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/courses", tags=["Courses"])

@router.get("/")
def get_all_courses():
    courses = []
    for course in courses_collection.find():
        course["_id"] = str(course["_id"])
        courses.append(course)
    return courses

@router.post("/add")
def create_course(course: CourseCreate):
    course_data = course.dict()
    
    # Inject backend defaults
    course_data.update({
        "aiStatus": {
            "mcqGenerated": False,
            "videoQuestionsGenerated": False
        },
        "createdBy": "admin",
        "createdAt": datetime.utcnow().isoformat()
    })
    
    result = courses_collection.insert_one(course_data)
    if result.inserted_id:
        return {
            "message": "Course added successfully", 
            "course_id": str(result.inserted_id)
        }
    raise HTTPException(status_code=400, detail="Failed to add course")

@router.get("/{course_id}")
def get_course(course_id: str):
    course = courses_collection.find_one({"_id": ObjectId(course_id)})
    
    if not course:
        raise HTTPException(404, "Course not found")

    course["_id"] = str(course["_id"])
    return course