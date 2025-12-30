from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client["Students_db"]
students_collection = db["students"]

print("MongoDB connected successfully")