import os
import smtplib
import ssl
from email.message import EmailMessage

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

GMAIL_EMAIL = os.getenv("GMAIL_EMAIL")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")
FRONTEND_URL = os.getenv("FRONTEND_URL")

async def send_reset_email(email: str, token: str, role: str):
    reset_link = f"{FRONTEND_URL}/{role}/reset-password?token={token}"

    msg = EmailMessage()
    msg["From"] = GMAIL_EMAIL
    msg["To"] = email
    msg["Subject"] = "Reset Your Password"

    msg.set_content(f"""
Hello,

Click the link below to reset your password:
{reset_link}

This link expires in 1 hour.
""")

    context = ssl.create_default_context()

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls(context=context)
        server.login(GMAIL_EMAIL, GMAIL_APP_PASSWORD)
        server.send_message(msg)
