from fastapi import FastAPI
from app.routes import student,courses,admin,ai
from fastapi.middleware.cors import CORSMiddleware


import os
from dotenv import load_dotenv
from pathlib import Path


# Load .env
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


app = FastAPI(title="AI Student Evaluation System")


frontend_url = os.getenv("FRONTEND_URL")
origins = [
   "http://192.168.31.17:3000",
   "http://localhost:3000",
   "http://127.0.0.1:3000",
]
if frontend_url:
   origins.append(frontend_url)


app.add_middleware(
   CORSMiddleware,
   allow_origins=origins,
   allow_credentials=True,
   allow_methods=["*"],
   allow_headers=["*"],
)


@app.get("/")
def root():
   return {"message": "Backend is running"}


app.include_router(student.router)
app.include_router(admin.router)
app.include_router(courses.router)
app.include_router(ai.router)
