
import os
import sys
from bson import ObjectId
from datetime import datetime

# Set up path to include the backend app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from app.database.connection import results_collection, courses_collection, video_questions_collection, students_collection
from app.routes.student import process_video_test_analysis

def setup_mock_data():
    print("Setting up mock data...")
    
    # 1. Create a dummy student if not exists
    student = students_collection.find_one({"email": "test_student@example.com"})
    if not student:
        student_id = students_collection.insert_one({
            "firstName": "Test",
            "lastName": "Student",
            "email": "test_student@example.com",
            "role": "student"
        }).inserted_id
    else:
        student_id = student["_id"]

    # 2. Find an existing course or use a placeholder
    course = courses_collection.find_one()
    if not course:
        print("No courses found in database. Please add a course first.")
        return None, None
    course_id = course["_id"]

    # 3. Ensure video questions exist for this course
    video_questions_collection.update_one(
        {"courseId": course_id},
        {"$set": {
            "courseTitle": course.get("title"),
            "videoQuestions": [
                {"question": "Explain supervised learning", "relatedSkill": "Machine Learning"},
                {"question": "How does backpropagation work?", "relatedSkill": "Deep Learning"}
            ],
            "updatedAt": datetime.utcnow()
        }},
        upsert=True
    )

    # 4. Create a mock test result with transcripts
    results_collection.update_one(
        {
            "studentId": student_id,
            "courseId": course_id
        },
        {"$set": {
            "courseTitle": course.get("title"),
            "score": 85,
            "timestamp": datetime.utcnow(),
            "videoAnswers": [
                {
                    "questionId": "Q1",
                    "transcript": "Supervised learning is a type of machine learning where the model is trained on labeled data."
                },
                {
                    "questionId": "Q2",
                    "transcript": "Backpropagation is an algorithm used to calculate gradients in neural networks for optimizing weights."
                }
            ],
            "videoTestEvaluationStatus": "transcribed"
        }},
        upsert=True
    )
    
    return str(student_id), str(course_id)

def verify_analysis(student_id, course_id):
    print(f"Triggering analysis for Student: {student_id}, Course: {course_id}")
    process_video_test_analysis(student_id, course_id)
    
    # Check results
    result = results_collection.find_one({
        "studentId": ObjectId(student_id),
        "courseId": ObjectId(course_id)
    })
    
    if result and "overallVideoScore" in result:
        print("✅ Analysis Successful!")
        print(f"Overall Score: {result.get('overallVideoScore')}")
        print(f"Skill Gap: {result.get('skillGap')}")
        for ans in result.get("videoAnswers", []):
            print(f"- Question: {ans.get('questionId')}, Score: {ans.get('analysis', {}).get('technicalScore')}")
    else:
        print("❌ Analysis failed or fields missing in DB.")

if __name__ == "__main__":
    s_id, c_id = setup_mock_data()
    if s_id and c_id:
        verify_analysis(s_id, c_id)
