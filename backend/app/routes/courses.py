from fastapi import APIRouter, HTTPException, Depends
from app.database.connection import courses_collection
from app.schemas.courses import CourseCreate, CourseUpdate
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
        
    # Check if a course with the same title already exists (case-insensitive)
    existing_course = courses_collection.find_one({"title": {"$regex": f"^{course.title}$", "$options": "i"}})
    if existing_course:
        raise HTTPException(status_code=400, detail=f"Course with title '{course.title}' already exists")

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
    if not ObjectId.is_valid(course_id):
        raise HTTPException(status_code=400, detail=f"'{course_id}' is not a valid ObjectId")
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

@router.put("/{course_id}")
def update_course(course_id: str, course_update: CourseUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update courses")

    if not ObjectId.is_valid(course_id):
        raise HTTPException(status_code=400, detail=f"'{course_id}' is not a valid ObjectId")

    # Check if course exists and belongs to admin
    course = courses_collection.find_one({"_id": ObjectId(course_id)})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Optional: restricts admin to only edit their own courses
    # if str(course.get("createdBy")) != str(current_user["_id"]):
    #     raise HTTPException(status_code=403, detail="You can only edit your own courses")

    update_data = {k: v for k, v in course_update.dict().items() if v is not None}

    # Check if title is being updated and if the new title already exists (case-insensitive)
    if "title" in update_data:
        existing_course = courses_collection.find_one({
            "title": {"$regex": f"^{update_data['title']}$", "$options": "i"},
            "_id": {"$ne": ObjectId(course_id)}
        })
        if existing_course:
            raise HTTPException(status_code=400, detail=f"Course with title '{update_data['title']}' already exists")

    print(f"Update data received for {course_id}: {update_data}")

    # Check for questions before publishing
    # Only trigger if specifically changing status TO "published"
    new_status = update_data.get("status")
    current_status = course.get("status")
    
    if new_status and str(new_status).lower() == "published" and str(current_status).lower() != "published":
        from app.database.connection import mcq_collection, video_questions_collection
        
        # We need to find the single document that contains the array of questions
        mcq_doc = mcq_collection.find_one({"courseId": ObjectId(course_id)})
        mcq_count = len(mcq_doc.get("mcqs", [])) if mcq_doc else 0
        
        video_doc = video_questions_collection.find_one({"courseId": ObjectId(course_id)})
        video_count = len(video_doc.get("videoQuestions", [])) if video_doc else 0
        
        print(f"Publish check for {course_id} results: MCQs={mcq_count}, Videos={video_count}")
        
        if mcq_count < 5:
            raise HTTPException(status_code=400, detail=f"Cannot publish course without at least 5 MCQs. We only found {mcq_count}.")
        if video_count < 3:
            raise HTTPException(status_code=400, detail=f"Cannot publish course without at least 3 Video Questions. We only found {video_count}.")

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = courses_collection.update_one(
        {"_id": ObjectId(course_id)},
        {"$set": update_data}
    )

    if result.modified_count > 0:
        return {"message": "Course updated successfully"}
    
    return {"message": "No changes made to the course"}
