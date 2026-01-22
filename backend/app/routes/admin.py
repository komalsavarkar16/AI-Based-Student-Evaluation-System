from fastapi import APIRouter, HTTPException, status
from app.schemas.admin import AdminCreate, AdminLogin
from app.database.connection import db, admins_collection
from app.core.security import hash_password, verify_password
from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest
from app.services.email_service import send_reset_email
import secrets
from datetime import datetime, timedelta

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.post("/register")
def register_admin(admin: AdminCreate):
    # Check if admin already exists
    if admins_collection.find_one({"email": admin.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    admin_dict = admin.model_dump()

    admin_dict["password"] = hash_password(admin.password)
    admin_dict["role"] = "admin"

    # 🚨 REMOVE confirmPassword if it exists
    admin_dict.pop("confirmPassword", None)

    admins_collection.insert_one(admin_dict)

    return {"message": "Admin registered successfully"}


@router.post("/login")
async def login_admin(data: AdminLogin):
    admin = admins_collection.find_one({"email": data.email})

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not verify_password(data.password, admin["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    return {
        "message": "Login successful",
        "admin": {
            "id": str(admin["_id"]),
            "email": admin["email"],
            "firstName": admin["firstName"],
            "lastName": admin["lastName"],
        },
        "role": admin["role"]
    }

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    admin = admins_collection.find_one({"email": data.email})

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = secrets.token_urlsafe(32)
    expiry = datetime.utcnow() + timedelta(hours=1)

    admins_collection.update_one(
        {"_id": admin["_id"]},
            {"$set": {
                "reset_token": token,
                "reset_token_expiry": expiry
            }}
        )

    await send_reset_email(data.email, token, "admin")
    
    return {
        "message": "If your email is registered, you will receive a reset link shortly."
        }

# @router.post("/forgot-password")
# async def forgot_password(data: ForgotPasswordRequest):
#     admin = admins_collection.find_one({"email": data.email})
#     if not admin:
#         # We return success even if user doesn't exist for security (prevent email enumeration)
#         return {"message": "If your email is registered, you will receive a reset link shortly."}

#     token = secrets.token_urlsafe(32)
#     expiry = datetime.utcnow() + timedelta(hours=1)

#     admins_collection.update_one(
#         {"_id": admin["_id"]},
#         {"$set": {"reset_token": token, "reset_token_expiry": expiry}}
#     )

#     await send_reset_email(data.email, token, "admin")

#     return {"message": "If your email is registered, you will receive a reset link shortly."}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    admin = admins_collection.find_one({
        "reset_token": data.token,
        "reset_token_expiry": {"$gt": datetime.utcnow()}
    })

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    hashed_password = hash_password(data.new_password)
    admins_collection.update_one(
        {"_id": admin["_id"]},
        {
            "$set": {"password": hashed_password},
            "$unset": {"reset_token": "", "reset_token_expiry": ""}
        }
    )

    return {"message": "Password reset successfully"}
