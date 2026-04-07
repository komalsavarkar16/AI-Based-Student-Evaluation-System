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
    # Ensure FRONTEND_URL doesn't have a trailing slash to avoid double slashes in the link
    base_url = FRONTEND_URL.rstrip('/')
    reset_link = f"{base_url}/{role}/reset-password?token={token}"

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

    try:
        # Try port 587 with STARTTLS first
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
            server.starttls(context=context)
            server.login(GMAIL_EMAIL, GMAIL_APP_PASSWORD)
            server.send_message(msg)
            print(f"Reset email sent successfully to {email}")
    except Exception as e:
        print(f"Failed to send email via port 587: {e}")
        try:
            # Fallback to port 465 with SSL if 587 fails
            with smtplib.SMTP_SSL(SMTP_SERVER, 465, timeout=10, context=context) as server:
                server.login(GMAIL_EMAIL, GMAIL_APP_PASSWORD)
                server.send_message(msg)
                print(f"Reset email sent successfully to {email} via port 465")
        except Exception as e2:
            print(f"Critical Email Error: Both ports 587 and 465 failed. {e2}")
            # We don't raise here to prevent 500 errors in the caller if not awaited correctly
            # or if called via BackgroundTasks
            pass
