import os
import smtplib
from email.mime.text import MIMEText

GMAIL_EMAIL = os.getenv("GMAIL_EMAIL")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")
FRONTEND_URL = os.getenv("FRONTEND_URL")

async def send_reset_email(to_email: str, token: str, role: str):
    # Determine front-end base URL
    base_url = FRONTEND_URL.rstrip("/") if FRONTEND_URL else "http://localhost:3000"
    link = f"{base_url}/{role}/reset-password?token={token}"

    msg = MIMEText(f"Click the link to reset your password: {link}\n\nThis link expires in 15 minutes.")
    msg['Subject'] = "Password Reset"
    msg['From'] = GMAIL_EMAIL
    msg['To'] = to_email

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(GMAIL_EMAIL, GMAIL_APP_PASSWORD)
            server.send_message(msg)
            print(f"📧 Reset email sent successfully to {to_email}")
            return True
    except Exception as e:
        print(f"❌ Critical Email Error: {e}")
        return False
