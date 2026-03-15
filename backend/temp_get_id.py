import sys
sys.path.append('.')
from app.database.connection import results_collection
doc = results_collection.find_one({"videoAnswers": {"$exists": True, "$ne": []}})
if doc:
    print(f"{doc['studentId']} {doc['courseId']}")
else:
    print("None")
