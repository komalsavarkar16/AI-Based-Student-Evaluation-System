from fastapi import FastAPI
from app.routes import student,courses,admin
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI Student Evaluation System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://192.168.31.17:3000","http://localhost:3000"],  # Next.js URL
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