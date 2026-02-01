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
results_collection = db["test_results"]



print("MongoDB connected successfully")