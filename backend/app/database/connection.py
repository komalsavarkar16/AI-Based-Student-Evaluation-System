from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client["Students_db"]
db1 = client["Admin_db"]
students_collection = db["students"]
admins_collection = db1["admins"]

print("MongoDB connected successfully")