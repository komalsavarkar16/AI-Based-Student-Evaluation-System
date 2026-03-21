import os
import sys
import json
from bson import ObjectId
from dotenv import load_dotenv

# Add project root to sys.path to allow absolute imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app.database.connection import results_collection
from app.routes.student import process_video_test_analysis

load_dotenv()

def run_manual_evaluation(result_id_str):
    print(f"--- Triggering Manual AI Evaluation for Result ID: {result_id_str} ---")
    
    try:
        result_id = ObjectId(result_id_str)
    except:
        print(f"Error: Invalid Result ID format: {result_id_str}")
        return

    # 1. Fetch Result to get student and course context
    result = results_collection.find_one({"_id": result_id})
    if not result:
        print("Error: Result not found in database.")
        return
    
    student_id = str(result.get("studentId"))
    course_id = str(result.get("courseId"))
    
    if not student_id or not course_id:
        print("Error: Result is missing studentId or courseId.")
        return

    print(f"Student ID: {student_id}")
    print(f"Course ID: {course_id}")
    print(f"Course Title: {result.get('courseTitle')}")

    # 2. Check if transcripts exist
    if not result.get("videoAnswers") or len(result.get("videoAnswers", [])) == 0:
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
        print("Usage: python run_ai_analysis.py <result_id>")
        sys.exit(1)
        
    res_id = sys.argv[1]
    run_manual_evaluation(res_id)
