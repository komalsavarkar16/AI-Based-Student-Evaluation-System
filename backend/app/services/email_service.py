import os
import requests

# Configuration
GMAIL_EMAIL = os.getenv("GMAIL_EMAIL")
FRONTEND_URL = os.getenv("FRONTEND_URL")
BREVO_API_KEY = os.getenv("BREVO_API_KEY")

async def send_reset_email(email: str, token: str, role: str):
    # Ensure FRONTEND_URL doesn't have a trailing slash
    base_url = FRONTEND_URL.rstrip('/')
    reset_link = f"{base_url}/{role}/reset-password?token={token}"
    subject = "Reset Your Password"
    content = f"""
Hello,

Click the link below to reset your password:
{reset_link}

This link expires in 1 hour.
"""

    if not BREVO_API_KEY:
        print("⚠️ BREVO_API_KEY is not set. Email cannot be sent.")
        return False

    try:
        response = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "api-key": BREVO_API_KEY,
                "Content-Type": "application/json"
            },
            json={
                "sender": {"name": "SkillBridge AI", "email": GMAIL_EMAIL},
                "to": [{"email": email}],
                "subject": subject,
                "textContent": content
            },
            timeout=10
        )
        if 200 <= response.status_code < 300:
            print(f"📧 Reset email sent successfully to {email}")
            return True
        else:
            print(f"🚫 Brevo API Error: {response.text}")
            return False
    except Exception as e:
        print(f"⚠️ Critical error sending email: {e}")
        return False
