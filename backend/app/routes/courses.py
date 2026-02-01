from fastapi import APIRouter, HTTPException, Depends
from app.database.connection import courses_collection
from app.schemas.courses import CourseCreate
from datetime import datetime
from bson import ObjectId
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/courses", tags=["Courses"])

@router.get("/")
def get_all_courses(current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    role = current_user["role"]
    
    query = {}
    if role == "admin":
        # Admin sees their own courses OR any published courses
        query = {"$or": [{"createdBy": user_id}, {"status": "published"}]}
    else:
        # Student sees all published courses
        query = {"status": "published"}
        
    courses = []
    for course in courses_collection.find(query):
        course["_id"] = str(course["_id"])
        courses.append(course)
    return courses

@router.post("/add")
def create_course(course: CourseCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create courses")
        
    course_data = course.dict()
    
    # Inject backend defaults
    course_data.update({
        "aiStatus": {
            "mcqGenerated": False,
            "videoQuestionsGenerated": False
        },
        "createdBy": current_user["_id"],
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
def get_course(course_id: str, current_user: dict = Depends(get_current_user)):
    course = courses_collection.find_one({"_id": ObjectId(course_id)})
    
    if not course:
        raise HTTPException(404, "Course not found")

    # Access control
    if current_user["role"] == "admin":
        # Admin can access their own courses OR any published course
        if str(course.get("createdBy")) != str(current_user["_id"]) and course.get("status") != "published":
            raise HTTPException(403, "Access denied")
    
    # Students can only see published courses
    if current_user["role"] == "student" and course.get("status") != "published":
        raise HTTPException(403, "Access denied")

    course["_id"] = str(course["_id"])
    return course
