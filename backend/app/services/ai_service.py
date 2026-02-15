import os
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini using the working method from test.py
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

def generate_mcqs(course):
    """
    Generates MCQs for a given course using the new Google GenAI SDK.
    """
    client = genai.Client(api_key=GEMINI_API_KEY)
    
    prompt = f"""
    You are an expert educator.
    Generate 10 VERY BASIC level Multiple Choice Questions (MCQs) 
    for absolute beginners who are just starting this course.
    Course Details:
    Title: {course.get('title')}
    Description: {course.get('description')}
    Skills Required: {', '.join(course.get('skills_required', []))}
    Level: {course.get('level')}
    Difficulty Rules:
    - Questions must test ONLY fundamental definitions and simple concepts.
    - Avoid advanced theory, coding logic, algorithms, or scenario-based questions.
    - Questions should test recall and basic understanding only.
    - Assume the student has only introductory knowledge.
    Requirements:
    1. Exactly 10 questions.
    2. Each question must have exactly 4 options.
    3. Only one correct answer.
    4. Options must be short and simple.
    5. The output MUST be a valid JSON array.
    6. Each object must contain:
    - "question"
    - "options" (array of 4 strings)
    - "answer" (must match one option exactly)
    Return ONLY the JSON array.
    """
    try:
        # Using the model confirmed working in test.py
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt
        )
        
        text = response.text.strip()
        
        # Clean the response from markdown if present
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        
        return json.loads(text)
    except Exception as e:
        print(f"Error in generate_mcqs: {str(e)}")
        raise e

def generate_video_questions(course):
    """
    Generate 6 basic domain specific questions for the course course using the new Google GenAI SDK.
    """
    client = genai.Client(api_key=GEMINI_API_KEY)

    prompt = f"""
    You are an expert educator.

    We want to evaluate whether a student is eligible to enroll in the following course.
    The purpose of this test is to check the student's foundational domain knowledge 
    based on the required skills of the course.

    Generate 6 domain-based eligibility questions.

    Title: {course.get('title')}
    Description: {course.get('description')}
    Skills Required: {', '.join(course.get('skills_required', []))}
    Level: {course.get('level')}

    Requirements:
    1. The questions must test only foundational and prerequisite knowledge.
    2. Questions should be suitable for spoken (video) answers.
    3. Avoid advanced, complex, or deep analytical questions.
    4. Each question must clearly relate to one of the required skills.
    5. Questions should assess conceptual clarity and basic understanding.
    6. Output should be in JSON format as an array of objects.
    7. Don't frame to much long questions.
    8. Answer should be between two or three lines only.
    9. Each object must have:
    - "question"
    - "relatedSkill"

    Return ONLY the JSON array.
    """


    # prompt = f"""
    # You are an expert educator. 
    # We want to test basic knowledge of the student in the following course to check if he is eligible for the next level, so give only basic questions:
    # We only basic questions to check eligiblity of student for following course:
    # Generate 3 basic course specific questions:
    
    # Title: {course.get('title')}
    # Description: {course.get('description')}
    # Skills Required: {', '.join(course.get('skills_required', []))}
    # Level: {course.get('level')}
    
    # Requirements:
    # 1. The questions should be related to the course content.
    # 2. The questions should be of basic level.
    # 3. Output should be in JSON format as an array of objects.
    # 4. Each object should have "question" and "relatedSkill" (the specific skill being tested).
    
    # Return ONLY the JSON array.
    # """


    try:
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt
        )
        
        text = response.text.strip()
        
        # Clean the response from markdown if present
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        
        return json.loads(text)
    except Exception as e:
        print(f"Error in generate_video_questions: {str(e)}")
        raise e

def analyze_test_results(answers, course_title):
    """
    Analyzes student test answers to identify weak skills and provide recommendations.
    """
    client = genai.Client(api_key=GEMINI_API_KEY)
    
    prompt = f"""
    You are an AI learning assistant. A student has just completed an MCQ assessment for the course "{course_title}".
    
    Based on the following question and answer log, identify the student's weak areas and provide specific learning recommendations.
    
    Test Answers:
    {json.dumps(answers, indent=2)}
    
    Requirements:
    1. Identify 2-3 specific weak skills/topics.
    2. Provide 2-3 actionable learning recommendations (e.g., "Review documentation on...", "Practice ...").
    3. The output MUST be a valid JSON object with two keys: "weak_skills" (array of strings) and "recommendations" (array of strings).
    4. Be encouraging and constructive.
    
    Return ONLY the JSON object.
    """

    try:
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt
        )
        
        text = response.text.strip()
        
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        return json.loads(text)
    except Exception as e:
        print(f"Error in analyze_test_results: {str(e)}")
        return {
            "weak_skills": ["Needs review of the course material"],
            "recommendations": ["Review the core concepts of the course again."]
        }

def evaluate_video_answer(question, transcript, course_details):
    """
    Evaluates a single video answer transcript using Gemini.
    """
    client = genai.Client(api_key=GEMINI_API_KEY)
    
    prompt = f"""
    You are an expert technical interviewer. Evaluate the following student response for a technical question.
    
    Course Context:
    - Title: {course_details.get('title')}
    - Level: {course_details.get('level')}
    - Required Skills: {', '.join(course_details.get('skills_required', []))}
    
    Evaluation Criteria:
    Question: {question}
    Student's Answer (Transcript): {transcript}
    
    Requirements:
    1. Provide a "technicalScore" between 0 and 10.
    2. Provide "feedback" on the answer (what was good, what was missing).
    3. Identify "improvementAreas" (array of strings).
    4. The output MUST be a valid JSON object.
    
    Return ONLY the JSON object.
    """

    try:
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt
        )
        
        text = response.text.strip()
        
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        return json.loads(text)
    except Exception as e:
        print(f"Error in evaluate_video_answer: {str(e)}")
        return {
            "technicalScore": 0,
            "feedback": "Evaluation failed due to an error.",
            "improvementAreas": ["Check connection or retry evaluation."]
        }
