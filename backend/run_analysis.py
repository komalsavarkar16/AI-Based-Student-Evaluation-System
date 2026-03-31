import sys
import os
from bson import ObjectId
from datetime import datetime

# Add the current directory to sys.path so 'app' can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.services.transcription_service import transcribe_videos
    from app.database.connection import responses_collection, ai_evaluations_collection, admissions_status_collection
    print("Successfully imported transcription_service and database connection")
except ImportError as e:
    print(f"Error importing app modules: {e}")
    sys.exit(1)

def main():
    if len(sys.argv) < 3:
        print("Usage: python run_analysis.py <student_id> <course_id>")
        sys.exit(1)

    student_id = sys.argv[1]
    course_id = sys.argv[2]

    # Validate ObjectIds
    try:
        sid = ObjectId(student_id)
        cid = ObjectId(course_id)
    except Exception:
        print("Invalid studentId or courseId format. Must be a 24-character hex string.")
        sys.exit(1)

    print(f"Starting full transcription & analysis pipeline for:")
    print(f"  Student ID: {student_id}")
    print(f"  Course ID:  {course_id}")
    
    # Step 1: Fetch existing data to get the video URLs
    try:
        response_doc = responses_collection.find_one({
            "studentId": sid,
            "courseId": cid
        }, sort=[("submittedAt", -1)])
        
        if not response_doc:
            print("No response record found for this student and course.")
            sys.exit(1)
            
        video_urls_to_process = response_doc.get("videoUrls", [])
        
        if not video_urls_to_process:
            print("Could not find any video URLs in latest response record.")
            sys.exit(1)
            
        print(f"Found {len(video_urls_to_process)} videos to process.")
        
    except Exception as e:
         print(f"Error fetching data from DB: {e}")
         sys.exit(1)

    # Step 2: Clear existing data (Normalized)
    try:
        rid = response_doc["_id"]
        
        print("Clearing existing video analysis and transcription data from Normalized collections...")
        
        # Clear AI Evaluation
        ai_evaluations_collection.delete_one({"responseId": rid})
        
        # Reset Admissions Status to Pending
        admissions_status_collection.update_one(
            {"responseId": rid},
            {"$set": {
                "status": "Pending",
                "decisionNotes": "Re-triggered analysis",
                "decidedAt": datetime.utcnow()
            }}
        )
        
        # Clear video answers from response
        responses_collection.update_one(
            {"_id": rid},
            {"$unset": {"videoAnswers": ""}}
        )
        
        print(f"DB reset complete for Response ID: {rid}")

    except Exception as e:
        print(f"Warning: Failed to clear existing data: {e}")

    # Step 3: Trigger full pipeline (Transcription -> Analysis)
    try:
        print("Starting Gemini Video Transcription process...")
        transcribe_videos(student_id, course_id, video_urls_to_process)
        print("\nPipeline finished.")
    except Exception as e:
        print(f"An error occurred during pipeline execution: {e}")

if __name__ == "__main__":
    main()
