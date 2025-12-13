from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import get_db, User, init_db
from datetime import datetime
import os
import random
import string
import uuid

router = APIRouter()

# --- MOCK OAUTH (Since no real keys) ---
# In a real app, we would use 'fastapi-sso' and real Client Keys.
# For this demo, we simulate the flow to show the UI working.

@router.get("/auth/google/login")
async def google_login():
    # Simulate redirect to Google
    return RedirectResponse(url="/auth/google/callback?code=mock_google_code_123")

@router.get("/auth/google/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    # Mock Google User
    google_email = "mock.user.google@gmail.com"
    google_name = "Mock Google User"
    
    # Check if user exists
    user = db.query(User).filter(User.email == google_email).first()
    if not user:
        user = User(
            email=google_email,
            full_name=google_name,
            hashed_password="oauth_user", # Placeholder
            role="user",
            provider="google",
            last_active=datetime.utcnow()
        )
        db.add(user)
    else:
        # Update last_active for existing user
        user.last_active = datetime.utcnow()
    
    db.commit()
    db.refresh(user)
    
    # Redirect to Frontend with token (Simulated)
    # In real app, we would send a Secure HTTPOnly Cookie or a short-lived token
    return RedirectResponse(
        url=f"/?token=mock-oauth-jwt-token&role={user.role}&email={user.email}&id={user.id}&full_name={user.full_name}"
    )

@router.get("/auth/github/login")
async def github_login():
    return RedirectResponse(url="/auth/github/callback?code=mock_github_code_abc")

@router.get("/auth/github/callback")
async def github_callback(code: str, db: Session = Depends(get_db)):
    # Mock GitHub User
    github_email = "coder.cat@github.com"
    github_name = "Octocat Mock"
    
    user = db.query(User).filter(User.email == github_email).first()
    if not user:
        user = User(
            email=github_email,
            full_name=github_name,
            hashed_password="oauth_user",
            role="user",
            provider="github",
            last_active=datetime.utcnow()
        )
        db.add(user)
    else:
        user.last_active = datetime.utcnow()

    db.commit()
    db.refresh(user)
        
    return RedirectResponse(
        url=f"/?token=mock-oauth-jwt-token&role={user.role}&email={user.email}&id={user.id}&full_name={user.full_name}"
    )

# --- FORGOT PASSWORD (MOCK) ---

from pydantic import BaseModel

class ForgotRequest(BaseModel):
    email: str

class ResetRequest(BaseModel):
    email: str
    otp: str
    new_password: str

# In-memory OTP store (for demo)
otp_store = {}

@router.post("/auth/forgot-password")
async def forgot_password(req: ForgotRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        # Don't reveal user existence security-wise, but for demo we can
        return {"message": "If email exists, OTP sent."}
    
    # Generate Mock 6-digit OTP
    otp = "".join(random.choices(string.digits, k=6))
    otp_store[req.email] = otp
    
    print(f"========================================")
    print(f" [MOCK EMAIL] Password Reset for {req.email}")
    print(f" OTP CODE: {otp}")
    print(f"========================================")
    
    return {"message": f"OTP sent to email! (DEMO MODE: Your code is {otp})"}

@router.post("/auth/reset-password")
async def reset_password(req: ResetRequest, db: Session = Depends(get_db)):
    # Verify OTP
    stored_otp = otp_store.get(req.email)
    if not stored_otp or stored_otp != req.otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Update Password
    import bcrypt
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(req.new_password.encode('utf-8'), salt).decode('utf-8')
    
    user.hashed_password = hashed
    db.commit()
    
    # Clear OTP
    del otp_store[req.email]
    
    return {"message": "Password reset successfully. Please login."}
