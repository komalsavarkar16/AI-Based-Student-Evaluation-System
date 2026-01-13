from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client["Students_db"]
db1 = client["Admin_db"]
courses = client["Courses_DB"]
students_collection = db["students"]
admins_collection = db1["admins"]
courses_collection = courses["Courses"]
mcq_collection = courses["Courses_MCQs"]


print("MongoDB connected successfully")