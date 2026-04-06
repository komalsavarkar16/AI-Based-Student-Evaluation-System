from fastapi import Depends, HTTPException, status, Cookie, Request
from jose import JWTError, jwt
from app.core.security import SECRET_KEY, ALGORITHM
from app.database.connection import students_collection, admins_collection
from bson import ObjectId
from typing import Optional

async def get_current_user(request: Request, access_token: Optional[str] = Cookie(None)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # If cookie is missing, check Authorization header
    if not access_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            access_token = auth_header.split(" ")[1]

    if not access_token:
        raise credentials_exception

    try:
        payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        if user_id is None or role is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    collection = admins_collection if role == "admin" else students_collection
    user = collection.find_one({"_id": ObjectId(user_id)})
    
    if user is None:
        raise credentials_exception
        
    user["_id"] = str(user["_id"])
    user["role"] = role
    return user
