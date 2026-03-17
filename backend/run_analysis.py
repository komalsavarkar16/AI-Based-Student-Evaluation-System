import sys
import os
from bson import ObjectId

# Add the current directory to sys.path so 'app' can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.services.transcription_service import transcribe_videos
    from app.database.connection import results_collection
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
        ObjectId(student_id)
        ObjectId(course_id)
    except Exception:
        print("Invalid studentId or courseId format. Must be a 24-character hex string.")
        sys.exit(1)

    print(f"Starting full transcription & analysis pipeline for:")
    print(f"  Student ID: {student_id}")
    print(f"  Course ID:  {course_id}")
    
    # Step 1: Fetch existing data to get the video URLs
    try:
        record = results_collection.find_one({
            "studentId": ObjectId(student_id),
            "courseId": ObjectId(course_id)
        })
        
        if not record:
            print("No test result record found for this student and course.")
            sys.exit(1)
            
        # Try to get videoUrls first (new schema)
        video_urls_to_process = record.get("videoUrls", [])
        
        # Fallback to reconstructing from videoAnswers (old schema)
        if not video_urls_to_process:
            video_answers = record.get("videoAnswers", [])
            for answer in video_answers:
                if "videoUrl" in answer and "questionId" in answer:
                    video_urls_to_process.append({
                        "question": answer["questionId"],
                        "url": answer["videoUrl"]
                    })
        
        if not video_urls_to_process:
            print("Could not find any video URLs in the record (checked videoUrls and videoAnswers).")
            sys.exit(1)
            
        print(f"Found {len(video_urls_to_process)} videos to process.")
        
    except Exception as e:
         print(f"Error fetching data from DB: {e}")
         sys.exit(1)

    # Step 2: Clear existing data
    try:
        reset_query = {
            "studentId": ObjectId(student_id),
            "courseId": ObjectId(course_id)
        }
        
        # We need to unset the old analysis results to start fresh
        update_op = {
            "$set": {
                "videoTestEvaluationStatus": "pending"
            },
            "$unset": {
                "overallVideoScore": "",
                "detailedSkillGap": "",
                "skillGap": "",
                "eligibilitySignal": "",
                "executiveSummary": "",
                "overallReasoning": "",
                "competencyGapReport": "",
                "vibeCheck": "",
                "aiVerdict": "",
                "evaluatedAt": "",
                "videoAnswers": ""
            }
        }
        
        print("Clearing existing video analysis and transcription data from DB...")
        res = results_collection.update_many(reset_query, update_op)
        print(f"DB reset complete. Modified {res.modified_count} records.")

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
