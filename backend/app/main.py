from fastapi import FastAPI
from app.routes import student
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI Student Evaluation System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Backend is running"}

app.include_router(student.router)
from app.routes import admin
app.include_router(admin.router)