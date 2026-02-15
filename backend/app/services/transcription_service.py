import os
import requests
from moviepy import VideoFileClip
from faster_whisper import WhisperModel
import torch
from app.database.connection import results_collection
from bson import ObjectId
from tempfile import NamedTemporaryFile
from dotenv import load_dotenv
import imageio_ffmpeg

load_dotenv()

# Add FFmpeg to PATH for Whisper (Fixes WinError 2)
ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
ffmpeg_dir = os.path.dirname(ffmpeg_path)

# Ensure ffmpeg.exe exists in that directory for Whisper to find
target_ffmpeg = os.path.join(ffmpeg_dir, "ffmpeg.exe")
if not os.path.exists(target_ffmpeg):
    import shutil
    try:
        shutil.copy(ffmpeg_path, target_ffmpeg)
    except Exception as e:
        print(f"Warning: Could not copy ffmpeg to ffmpeg.exe: {e}")

# Prepend ffmpeg_dir to PATH
if ffmpeg_dir not in os.environ["PATH"]:
    os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ["PATH"]

# Load Faster-Whisper model globally once
# "base" is fast and accurate. "large-v3" is most accurate but slower/heavier.
print("Loading Local Faster-Whisper model (base)...")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
# For faster-whisper, we specify device and compute_type
# int8 or float16 are good options for speed/memory
COMPUTE_TYPE = "float16" if DEVICE == "cuda" else "int8"
model = WhisperModel("base", device=DEVICE, compute_type=COMPUTE_TYPE)
print(f"Faster-Whisper model loaded successfully on {DEVICE} with {COMPUTE_TYPE}")

def transcribe_videos(student_id: str, course_id: str, video_urls: list):
    """
    Background task to transcribe videos locally using faster-whisper and update the database.
    """
    transcripts = []
    
    for item in video_urls:
        question_id = item.get("question")
        video_url = item.get("url")
        
        temp_video_path = None
        temp_audio_path = None
        
        try:
            print(f"Processing transcript locally for {question_id} using Faster-Whisper...")
            # Step 1: Fetch Video URL from Cloudinary
            response = requests.get(video_url, stream=True)
            with NamedTemporaryFile(delete=False, suffix=".mp4") as temp_video:
                for chunk in response.iter_content(chunk_size=8192):
                    temp_video.write(chunk)
                temp_video_path = temp_video.name
            
            # Step 2: Extract Audio from Video
            temp_audio_path = temp_video_path.replace(".mp4", ".mp3")
            video_clip = VideoFileClip(temp_video_path)
            
            if video_clip.audio:
                video_clip.audio.write_audiofile(temp_audio_path, logger=None)
                video_clip.close()
                
                # Step 3: Local Speech-to-Text Conversion with Faster-Whisper
                segments, info = model.transcribe(temp_audio_path, beam_size=5)
                
                transcript_text = ""
                for segment in segments:
                    transcript_text += segment.text + " "
                
                transcript_text = transcript_text.strip()
            else:
                video_clip.close()
                transcript_text = "[No audio detected in video]"
            
            # Step 4: Map Transcript with Question
            transcripts.append({
                "questionId": question_id,
                "videoUrl": video_url,
                "transcript": transcript_text
            })
            
        except Exception as e:
            print(f"Error processing {question_id}: {str(e)}")
            transcripts.append({
                "questionId": question_id,
                "videoUrl": video_url,
                "transcript": f"Transcription failed: {str(e)}"
            })
        finally:
            # Cleanup
            if temp_video_path and os.path.exists(temp_video_path):
                try: os.remove(temp_video_path)
                except: pass
            if temp_audio_path and os.path.exists(temp_audio_path):
                try: os.remove(temp_audio_path)
                except: pass

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
        print(f"Faster-Whisper transcription completed for student {student_id}")
        
        # Trigger analysis
        from app.routes.student import process_video_test_analysis
        process_video_test_analysis(student_id, course_id)
        
    except Exception as db_err:
        print(f"Failed to update DB or trigger analysis: {str(db_err)}")
