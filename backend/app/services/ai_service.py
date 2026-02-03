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
    We want to test basic knowledge of the student in the following course to check if he is eligible for the next level, so give only basic questions:
    Generate 10 basic Multiple Choice Questions (MCQs) for the following course:
    
    Title: {course.get('title')}
    Description: {course.get('description')}
    Skills Required: {', '.join(course.get('skills_required', []))}
    Level: {course.get('level')}
    
    Requirements:
    1. Each question must have exactly 4 options.
    2. There should be only one correct answer.
    3. The output MUST be a valid JSON array of objects.
    4. Each object must have: "question", "options" (array of 4 strings), and "answer" (string matching one of the options).
    
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
    Generate 12 basic domain specific questions for the course course using the new Google GenAI SDK.
    """
    client = genai.Client(api_key=GEMINI_API_KEY)

    prompt = f"""
    You are an expert educator. 
    We want to test basic knowledge of the student in the following course to check if he is eligible for the next level, so give only basic questions:
    We only basic questions to check eligiblity of student for following course:
    Generate 12 basic course specific questions:
    
    Title: {course.get('title')}
    Description: {course.get('description')}
    Skills Required: {', '.join(course.get('skills_required', []))}
    Level: {course.get('level')}
    
    Requirements:
    1. The questions should be related to the course content.
    2. The questions should be of basic level.
    3. Output should be in JSON format.
    4. Don't need options and only need questions.
    
    
    Return ONLY the JSON array.
    """


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
            model="gemini-2.0-flash-exp",
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
