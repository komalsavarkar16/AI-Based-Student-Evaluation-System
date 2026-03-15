import os
import requests
from app.database.connection import results_collection
from bson import ObjectId
from tempfile import NamedTemporaryFile
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# Initialize Gemini Client
client = genai.Client()

def transcribe_videos(student_id: str, course_id: str, video_urls: list):
    """
    Background task to transcribe videos using Gemini API and update the database.
    """
    transcripts = []
    
    for item in video_urls:
        question_id = item.get("question")
        video_url = item.get("url")
        
        temp_video_path = None
        uploaded_file = None
        
        try:
            print(f"Processing transcript for {question_id} using Gemini API...")
            
            # Step 1: Fetch Video URL from Cloudinary to a temporary file
            response = requests.get(video_url, stream=True)
            response.raise_for_status()
            
            with NamedTemporaryFile(delete=False, suffix=".mp4") as temp_video:
                for chunk in response.iter_content(chunk_size=8192):
                    temp_video.write(chunk)
                temp_video_path = temp_video.name
            
            # Step 2: Upload temporary file to Gemini
            print(f"Uploading {question_id} to Gemini...")
            uploaded_file = client.files.upload(file=temp_video_path)
            
            # Wait for video processing to complete (required for video files on Gemini)
            import time
            while uploaded_file.state.name == "PROCESSING":
                print(".", end="", flush=True)
                time.sleep(2)
                uploaded_file = client.files.get(name=uploaded_file.name)
            print() # Print new line after dots
            
            if uploaded_file.state.name == "FAILED":
                raise Exception("Gemini failed to process the uploaded video file.")
            
            # Step 3: Ask Gemini to Transcribe
            print(f"Generating transcript for {question_id}...")
            prompt = "Please provide a highly accurate, word-for-word transcript of the speech in this video. Do not include any other commentary, stage directions, or text other than the spoken words."
            
            gemini_response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[
                    uploaded_file,
                    prompt
                ]
            )
            
            transcript_text = gemini_response.text.strip()
            if not transcript_text:
                 transcript_text = "[Audio was empty or indiscernible]"
                 
            # Step 4: Map Transcript with Question
            transcripts.append({
                "questionId": question_id,
                "videoUrl": video_url,
                "transcript": transcript_text
            })
            print(f"Successfully transcribed {question_id}")
            
        except requests.exceptions.RequestException as req_err:
             print(f"Failed to download video {question_id}: {req_err}")
             transcripts.append({
                "questionId": question_id,
                "videoUrl": video_url,
                "transcript": f"Transcription failed (Download Error): {str(req_err)}"
            })
        except Exception as e:
             print(f"Error processing {question_id}: {str(e)}")
             transcripts.append({
                "questionId": question_id,
                "videoUrl": video_url,
                "transcript": f"Transcription failed (API Error): {str(e)}"
             })
        finally:
            # Cleanup local temporary file
            if temp_video_path and os.path.exists(temp_video_path):
                try: 
                    os.remove(temp_video_path)
                except Exception as e: 
                    print(f"Warning: Failed to delete temp file {temp_video_path}: {e}")
                    
            # Cleanup uploaded file from Google's servers
            if uploaded_file:
                try:
                    client.files.delete(name=uploaded_file.name)
                except Exception as e:
                    print(f"Warning: Failed to delete file from Gemini API {uploaded_file.name}: {e}")

    # Step 5: Store transcript in DB
    try:
        results_collection.update_one(
            {
                "studentId": ObjectId(student_id),
                "courseId": ObjectId(course_id)
            },
            {
                "$set": {
                    "videoAnswers": transcripts,
                    "videoTestEvaluationStatus": "transcribed"
                }
            }
        )
        print(f"Gemini transcription completed for student {student_id}")
        
        # Trigger analysis
        from app.routes.student import process_video_test_analysis
        process_video_test_analysis(student_id, course_id)
        
    except Exception as db_err:
        print(f"Failed to update DB or trigger analysis: {str(db_err)}")
