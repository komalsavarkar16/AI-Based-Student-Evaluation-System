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
    You are an expert educator. Generate 10 basic Multiple Choice Questions (MCQs) for the following course:
    
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
