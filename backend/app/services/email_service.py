import os
import smtplib
import ssl
import requests
from email.message import EmailMessage

# Configuration
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

GMAIL_EMAIL = os.getenv("GMAIL_EMAIL")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
RESEND_API_KEY = os.getenv("RESEND_API_KEY") # Recommended for Render/Vercel

async def send_reset_email(email: str, token: str, role: str):
    # Ensure FRONTEND_URL doesn't have a trailing slash to avoid double slashes in the link
    base_url = FRONTEND_URL.rstrip('/')
    reset_link = f"{base_url}/{role}/reset-password?token={token}"
    subject = "Reset Your Password"
    content = f"""
Hello,

Click the link below to reset your password:
{reset_link}

This link expires in 1 hour.
"""

    # 🚀 PRIMARY: Try using Resend API (Recommended for Cloud Hosting like Render)
    # This works over HTTP (Port 443) which is never blocked.
    if RESEND_API_KEY:
        try:
            response = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": f"onboarding@resend.dev", # Replace with your domain if verified
                    "to": email,
                    "subject": subject,
                    "text": content
                },
                timeout=10
            )
            if response.ok:
                print(f"Reset email sent via Resend API to {email}")
                return True
            else:
                print(f"Resend API Error: {response.text}")
        except Exception as e:
            print(f"Failed to send via Resend API: {e}")

    # 🔗 FALLBACK: SMTP (Likely to fail on Render but works locally)
    msg = EmailMessage()
    msg["From"] = GMAIL_EMAIL
    msg["To"] = email
    msg["Subject"] = subject
    msg.set_content(content)

    context = ssl.create_default_context()
    try:
        # Try port 587 with STARTTLS first
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
            server.starttls(context=context)
            server.login(GMAIL_EMAIL, GMAIL_APP_PASSWORD)
            server.send_message(msg)
            print(f"Reset email sent via SMTP (587) to {email}")
            return True
    except Exception as e:
        print(f"Failed via SMTP (587): {e}")
        try:
            # Fallback to port 465 with SSL if 587 fails
            with smtplib.SMTP_SSL(SMTP_SERVER, 465, timeout=10, context=context) as server:
                server.login(GMAIL_EMAIL, GMAIL_APP_PASSWORD)
                server.send_message(msg)
                print(f"Reset email sent via SMTP (465) to {email}")
                return True
        except Exception as e2:
            print(f"Critical Email Error: Both API and SMTP failed. {e2}")
            return False
