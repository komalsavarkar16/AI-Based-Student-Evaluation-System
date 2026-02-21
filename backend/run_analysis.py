import sys
import os
from bson import ObjectId

# Add the current directory to sys.path so 'app' can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.routes.student import process_video_test_analysis
    print("Successfully imported process_video_test_analysis")
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

    print(f"Starting manual video analysis for:")
    print(f"  Student ID: {student_id}")
    print(f"  Course ID:  {course_id}")
    
    # Step 1: Clear existing data
    try:
        from app.database.connection import results_collection
        
        # We also need to clear nested fields in 'videoAnswers' array
        # This unsets the analysis and relatedSkill for all items in the array
        reset_query = {
            "studentId": ObjectId(student_id),
            "courseId": ObjectId(course_id)
        }
        
        update_op = {
            "$set": {
                "videoTestEvaluationStatus": "transcribed"
            },
            "$unset": {
                "overallVideoScore": "",
                "skillGap": "",
                "eligibilitySignal": "",
                "executiveSummary": "",
                "overallReasoning": "",
                "evaluatedAt": "",
                "videoAnswers.$[].analysis": "",
                "videoAnswers.$[].relatedSkill": ""
            }
        }
        
        print("Clearing existing video analysis data from DB...")
        res = results_collection.update_many(reset_query, update_op)
        print(f"DB reset complete. Modified {res.modified_count} records.")

    except Exception as e:
        print(f"Warning: Failed to clear existing data: {e}")

    # Step 2: Trigger analysis
    try:
        process_video_test_analysis(student_id, course_id)
        print("\nAnalysis process triggered successfully.")
        print("Check the console logs above for progress and any errors from Gemini.")
    except Exception as e:
        print(f"An error occurred during analysis: {e}")

if __name__ == "__main__":
    main()
