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
            model="gemini-1.5-flash",
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

def generate_retest_mcqs(course, previous_gaps):
    """
    Generates 10 custom MCQs specifically targeting previous skill gaps for a retest.
    """
    client = genai.Client(api_key=GEMINI_API_KEY)
    
    prompt = f"""
    You are an expert educator. A student is retaking a simplified theoretical assessment for the course: "{course.get('title')}".
    The student previously struggled with these areas: {', '.join(previous_gaps)}.
    
    Generate 10 VERY SIMPLE, entry-level Multiple Choice Questions (MCQs) that specifically test the absolute basics of these weak areas.
    
    Difficulty Rules:
    - Questions must be at an absolute beginner level.
    - Focus strictly on the most fundamental definitions and simple "Hello World" level concepts of the struggling topics.
    - Avoid ANY advanced theory, logic, or complex scenarios.
    - Each question should be extremely clear and easy to understand.
    - The goal is to verify if they have learned the bare minimum fundamentals during their bridge course.

    Requirements:
    1. Exactly 10 questions.
    2. Each question must have exactly 4 simple options.
    3. One correct answer.
    4. The output MUST be a valid JSON array.
    5. Each object must contain:
    - "question"
    - "options" (array of 4 strings)
    - "answer" (must match one option exactly)
    
    Return ONLY the JSON array.
    """
    try:
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Error in generate_retest_mcqs: {str(e)}")
        return generate_mcqs(course)

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
            model="gemini-1.5-flash",
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

def generate_retest_video_questions(course, previous_gaps):
    """
    Generate 6 custom domain specific questions focused on previous skill gaps for a retest.
    """
    client = genai.Client(api_key=GEMINI_API_KEY)

    prompt = f"""
    You are an expert educator conducting a simplified retest interview for the course: "{course.get('title')}".

    The student previously struggled with these specific skills: {', '.join(previous_gaps)}.

    Your task is to generate 6 VERY BASIC, entry-level video-interview questions that test the student's mastery of the absolute fundamentals of these specific skill gaps.

    Requirements:
    1. The questions MUST focus on the simplest possible aspects of these skills: {', '.join(previous_gaps)}.
    2. Frame questions as basic recall or "how-to" at a beginner level (e.g., "What is a variable?" instead of "Discuss scope and memory allocation").
    3. Ensure they are extremely straightforward and suitable for short, spoken answers.
    4. The questions should be significantly simpler than the standard eligibility questions to verify basic foundational learning.
    5. Each question must target a specific gap from the provided list.
    6. Output should be in JSON format as an array of objects.
    7. Each object must have:
    - "question"
    - "relatedSkill" (one from the gaps provided)

    Return ONLY the JSON array.
    """

    try:
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Error in generate_retest_video_questions: {str(e)}")
        # Fallback to standard questions if AI fails
        return generate_video_questions(course)

def analyze_test_results(answers, course_title):
    """
    Analyzes student test answers to identify weak skills and provide recommendations.
    """
    client = genai.Client(api_key=GEMINI_API_KEY)
    
    prompt = f"""
    You are an AI learning assistant. A student has just completed an MCQ assessment for the course "{course_title}".
    
    Based on the following question and answer log, identify the student's weak areas and provide specific learning recommendations.
    
    Test Answers:
    {json.dumps(answers, indent=2, default=str)}
    
    Requirements:
    1. Identify 2-3 specific weak skills/topics.
    2. Provide 2-3 actionable learning recommendations (e.g., "Review documentation on...", "Practice ...").
    3. The output MUST be a valid JSON object with two keys: "weak_skills" (array of strings) and "recommendations" (array of strings).
    4. Be encouraging and constructive.
    
    Return ONLY the JSON object.
    """

    try:
        response = client.models.generate_content(
            model="gemini-1.5-flash",
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
            model="gemini-2.5-flash",
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

def discover_skill_gaps(mcq_answers, video_answers, course_details, threshold=6.5):
    """
    Consolidates MCQ marks (Theory) and Video metrics (Application) per skill,
    comparing against a threshold to flag and categorize gaps.
    """
    client = genai.Client(api_key=GEMINI_API_KEY)
    
    prompt = f"""
    You are an AI gap discovery engine. The student took an MCQ test and a Video test.
    Course Details:
    {json.dumps(course_details, indent=2, default=str)}
    
    MCQ Answers (Theory - mostly out of 100/boolean per question): 
    {json.dumps(mcq_answers, indent=2, default=str)}
    
    Video Answers (Application - out of 10 per skill):
    {json.dumps(video_answers, indent=2, default=str)}
    
    Required Proficiency Threshold equivalent: {threshold * 10}% (or {threshold}/10).
    
    Tasks:
    1. For each foundational skill taught in this course, consolidate an overall estimated score out of 10 by blending the MCQ correctness (related to that skill) and the Video technical Score for that skill.
    2. Compare this consolidated score against the threshold of {threshold}/10.
    3. If score < threshold, flag it as a "Gap".
    4. Categorize all flagged gaps into broader topics (e.g., "Logic Building", "Syntax", "Soft Skills", "Domain Concepts").
    
    Output strictly in this JSON format:
    [
      {{
        "category": "Topic Name",
        "skills": [
          {{
            "skillName": "Specific Skill",
            "score": 5.5,
            "threshold": {threshold},
            "isGap": true,
            "reasoning": "Failed MCQ on this topic and scored poorly on video application."
          }}
        ]
      }}
    ]
    """
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Error in discover_skill_gaps: {str(e)}")
        return []

def generate_overall_video_evaluation(evaluations, course_details):
    """
    Generate an overall eligibility signal and summary based on all per-answer evaluations.
    Provides a "Golden Report" containing competency gap, vibe check, and AI verdict.
    """
    client = genai.Client(api_key=GEMINI_API_KEY)

    prompt = f"""
    You are a senior admissions officer. Evaluate a student's overall eligibility for the course:
    Course: {course_details.get('title')} ({course_details.get('level')})

    Below are the individual skill evaluations from their video test. It includes transcripts, facial expressions, and confidence scores:
    {json.dumps(evaluations, indent=2, default=str)}

    Requirements:
    1. Provide an overall eligibility signal: "Pass", "Borderline", or "Fail".
    2. Write a concise executive summary of the student's performance.
    3. Determine the 'competencyGap': A summary of what technical or theoretical skills the student is lacking.
    4. Provide a 'vibeCheck': Insights derived from the video data (e.g. facial expression, confidence, communication skills, like "The student understands the logic but struggles to explain it clearly").
    5. Give an 'aiVerdict': A direct final recommendation (e.g., "Not Ready: Requires 2 weeks of Bridge Training in Java Basics", or "Ready: Shows strong potential and clear concepts").
    6. The output MUST be a valid JSON object.

    Return ONLY this JSON format:
    {{
      "overallEligibilitySignal": "",
      "executiveSummary": "",
      "overallReasoning": "",
      "competencyGap": "",
      "vibeCheck": "",
      "aiVerdict": ""
    }}
    """

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Error in generate_overall_video_evaluation: {str(e)}")
        return {
            "overallEligibilitySignal": "Borderline",
            "executiveSummary": "Manual review required due to evaluation error.",
            "overallReasoning": "Technical error during overall evaluation aggregation.",
            "competencyGap": "Unable to determine",
            "vibeCheck": "Unable to determine",
            "aiVerdict": "Unable to determine"
        }

def generate_bridge_path_b_content(skill_gaps):
    """
    Generate an AI Concept Checklist with at least 4 internet reference links based on skill gaps.
    """
    client = genai.Client(api_key=GEMINI_API_KEY)

    prompt = f"""
    The student has failed the following skills for the course: {json.dumps(skill_gaps, indent=2)}.
    Generate a Step-by-Step Concept Roadmap for these skills.

    Requirements:
    1. ONLY suggest basic, fundamental concepts to clear. DO NOT suggest in-depth or advanced topics.
    2. List the topics in a logical learning order.
    3. For each topic, provide a 1-sentence explanation of why it is important.
    4. Provide 3-4 sub-topics per main skill.
    5. Provide at least 4 high-quality reference links from the internet (e.g., official docs, reputable tutorials) where they can learn.
    6. Format the output as a clean, actionable checklist for a student.

    The output MUST be a valid JSON object matching this exact schema:
    {{
      "checklist": [
        {{ "concept": "string", "difficulty": "EASY|MEDIUM|HARD", "description": "string (1-sentence explanation of why it is important)", "subtopics": ["string", "string", "string"] }}
      ],
      "references": [
        {{ "title": "string", "url": "string" }}
      ]
    }}
    """

    try:
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Error in generate_bridge_path_b_content: {{str(e)}}")
        return {
            "checklist": [
                { "concept": "General Assessment Review", "difficulty": "EASY", "description": "Review the basic principles of the course material." }
            ],
            "references": [
                { "title": "Google Search", "url": "https://www.google.com" },
                { "title": "MDN Web Docs", "url": "https://developer.mozilla.org" },
                { "title": "W3Schools", "url": "https://www.w3schools.com" },
                { "title": "GeeksforGeeks", "url": "https://www.geeksforgeeks.org" }
            ]
        }

def generate_welcome_letter(student_name, course_title, overall_score):
    """
    Generates a personalized, professional welcome & enrollment letter for an approved student.
    """
    client = genai.Client(api_key=GEMINI_API_KEY)

    prompt = f"""
    You are the Admissions Dean at a prestigious AI Training Institute. 
    A student has just passed a rigorous evaluation gauntlet (MCQ + AI Video Interviews) and has been officially APPROVED for enrollment.

    Student Name: {student_name}
    Course: {course_title}
    Overall Performance Score: {overall_score}/100

    Generate a personalized, professional, and highly encouraging "Welcome & Enrollment" letter.
    
    Requirements:
    1. Tone: Professional, warm, and inspiring.
    2. Content:
       - Formal congratulations on passing the evaluation.
       - Briefly mention the impressive performance (referencing their score).
       - Welcome them to the program.
       - Mention that they have shown the necessary technical foundation and potential.
       - A closing statement about the journey ahead.
    3. Formatting: Use clear paragraphs. Include a formal header and sign-off.
    4. Keep it concise but meaningful (around 200-250 words).

    Return the letter as plain text.
    """

    try:
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        return response.text.strip()
    except Exception as e:
        print(f"Error in generate_welcome_letter: {str(e)}")
        return f"Dear {student_name},\n\nCongratulations! We are pleased to inform you that you have been approved for enrollment in the {course_title} program. Your performance during the evaluation process was impressive, and we are excited to have you join us.\n\nBest regards,\nThe Admissions Team"
