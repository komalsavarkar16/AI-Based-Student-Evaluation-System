import os
import sys
import json
from bson import ObjectId
from dotenv import load_dotenv

# Add project root to sys.path to allow absolute imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app.database.connection import responses_collection, courses_collection
from app.routes.student import process_video_test_analysis

load_dotenv()

def run_manual_evaluation(response_id_str):
    print(f"--- Triggering Manual AI Evaluation for Response ID: {response_id_str} ---")
    
    try:
        rid = ObjectId(response_id_str)
    except:
        print(f"Error: Invalid Response ID format: {response_id_str}")
        return

    # 1. Fetch Response to get student and course context
    response = responses_collection.find_one({"_id": rid})
    if not response:
        print("Error: Response not found in database.")
        return
    
    student_id = str(response.get("studentId"))
    course_id = str(response.get("courseId"))
    
    if not student_id or not course_id:
        print("Error: Response is missing studentId or courseId.")
        return

    course = courses_collection.find_one({"_id": ObjectId(course_id)})
    course_title = course.get("title") if course else "Unknown"

    print(f"Student ID: {student_id}")
    print(f"Course ID: {course_id}")
    print(f"Course Title: {course_title}")

    # 2. Check if transcripts exist
    if not response.get("videoAnswers") or len(response.get("videoAnswers", [])) == 0:
        print("Warning: No transcripts found in 'videoAnswers'.")
        print("If you need to RE-TRANSCRIBE from original videos, please use the transcription service first.")
        print("Currently, we will try to analyze existing answers.")

    # 3. Call the official application logic
    print("\n[Action] Running process_video_test_analysis...")
    try:
        # This function updates the database, calculates scores, and creates notifications
        process_video_test_analysis(student_id, course_id)
        print("\n✅ Success: AI Evaluation completed and Database updated!")
        print("You can now refresh the Admin Dashboard to see the 'Golden Report' and updated scores.")
    except Exception as e:
        print(f"\n❌ Error during evaluation: {str(e)}")

    print("\n--- Process Complete ---")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python run_ai_analysis.py <response_id>")
        sys.exit(1)
        
    res_id = sys.argv[1]
    run_manual_evaluation(res_id)
