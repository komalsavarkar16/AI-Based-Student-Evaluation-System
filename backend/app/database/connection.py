from pymongo import MongoClient
import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env from the backend root directory
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

client = MongoClient(os.getenv("MONGO_URI"))
db = client["Students_db"]
db1 = client["Admin_db"]
courses = client["Courses_DB"]
students_collection = db["students"]
admins_collection = db1["admins"]
courses_collection = courses["Courses"]
mcq_collection = courses["Courses_MCQs"]
video_questions_collection = courses["Courses_Video_Questions"]
results_collection = db["test_results"]
responses_collection = db["student_responses"]
ai_evaluations_collection = db["ai_evaluations"]
admissions_status_collection = db["admissions_status"]
bridge_curriculum_collection = db["bridge_curriculum"]
settings_collection = db1["system_settings"]
announcements_collection = db1["announcements"]



print("MongoDB connected successfully")