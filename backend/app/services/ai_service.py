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

def evaluate_video_answer(question_data, transcript, course_details):
    """
    Evaluates a single video answer transcript using Gemini.
    Structured for skill-based eligibility evaluation.
    """

    client = genai.Client(api_key=GEMINI_API_KEY)

    question_text = question_data.get("question")
    related_skill = question_data.get("relatedSkill")
    expected_concepts = question_data.get("expectedConcepts", [])

    prompt = f"""
You are a senior technical interviewer conducting a structured admission evaluation.

Your task is to evaluate whether the student demonstrates sufficient foundational 
knowledge in the given skill area.

Course Context:
- Title: {course_details.get('title')}
- Level: {course_details.get('level')}

Evaluated Skill:
{related_skill}

Question:
{question_text}

Expected Key Concepts:
{expected_concepts}

Student Transcript:
{transcript}

Evaluation Guidelines:

1. Check how many expected concepts were correctly covered.
2. Identify incorrect or misleading statements.
3. Evaluate conceptual clarity.
4. Evaluate explanation structure and coherence.
5. Ignore minor grammar mistakes — focus on knowledge.

Scoring Framework:

- conceptCoverageScore (0–10): Coverage of expected concepts
- technicalScore (0–10): Correctness of explanations
- clarityScore (0–10): Structure and communication clarity
- overallScore (0–10): Weighted evaluation
- skillLevelAssessment: Strong / Moderate / Weak

Return ONLY a valid JSON object in this format:

{{
  "skill": "",
  "conceptCoverageScore": 0,
  "technicalScore": 0,
  "feedback": "",
  "improvementAreas": [],
  "clarityScore": 0,
  "overallScore": 0,
  "skillLevelAssessment": "",
  "strengths": [],
  "weakAreas": [],
  "improvementSuggestions": []
}}
"""

    try:
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )

        return json.loads(response.text)

    except Exception as e:
        print(f"Error in evaluate_video_answer: {str(e)}")
        return {
            "skill": related_skill,
            "conceptCoverageScore": 0,
            "technicalScore": 0,
            "feedback": "Evaluation failed",
            "improvementAreas": [],
            "clarityScore": 0,
            "overallScore": 0,
            "skillLevelAssessment": "Weak",
            "strengths": [],
            "weakAreas": ["Evaluation failed"],
            "improvementSuggestions": ["Retry evaluation"]
        }

def generate_overall_video_evaluation(evaluations, course_details):
    """
    Generate an overall eligibility signal and summary based on all per-answer evaluations.
    """
    client = genai.Client(api_key=GEMINI_API_KEY)

    prompt = f"""
    You are a senior admissions officer. Evaluate a student's overall eligibility for the course:
    Course: {course_details.get('title')} ({course_details.get('level')})

    Below are the individual skill evaluations from their video test:
    {json.dumps(evaluations, indent=2)}

    Requirements:
    1. Provide an overall eligibility signal: "Pass", "Borderline", or "Fail".
    2. Write a concise executive summary of the student's performance.
    3. The output MUST be a valid JSON object.

    Return ONLY this JSON format:
    {{
      "overallEligibilitySignal": "",
      "executiveSummary": "",
      "overallReasoning": ""
    }}
    """

    try:
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Error in generate_overall_video_evaluation: {str(e)}")
        return {
            "overallEligibilitySignal": "Borderline",
            "executiveSummary": "Manual review required due to evaluation error.",
            "overallReasoning": "Technical error during overall evaluation aggregation."
        }
