from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import shutil
import os
import pdfplumber
import docx
import io
from database import engine, SessionLocal, Base, User, JobPost, init_db
from sqlalchemy.orm import Session
import bcrypt
from datetime import datetime, timedelta

# Initialize Database
init_db()

app = FastAPI()

# Include Auth Router
from auth_routes import router as auth_router
app.include_router(auth_router)

# CORS Config
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- UTILS ---
def extract_text_from_pdf(file_bytes):
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        text = ""
        for page in pdf.pages:
            text += page.extract_text() or ""
    return text

def extract_text_from_docx(file_bytes):
    doc = docx.Document(io.BytesIO(file_bytes))
    return "\n".join([para.text for para in doc.paragraphs])

# --- AUTH UTILS ---
from database import SystemLog, Message

def log_event(db: Session, level: str, message: str):
    new_log = SystemLog(level=level, message=message, timestamp=datetime.utcnow())
    db.add(new_log)
    db.commit()

def get_password_hash(password):
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password, hashed_password):
    password_byte_enc = plain_password.encode('utf-8')
    hashed_password_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_byte_enc, hashed_password_bytes)

# --- ENDPOINTS ---

# --- ENDPOINTS ---

@app.get("/system/reset-db-force-safe")
def reset_database_force():
    try:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        init_db() # Reseed admin/jobs
        return {"message": "Database completely reset and re-seeded. Schema is now fresh."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/scan-resume")
async def scan_resume(file: UploadFile = File(...)):
    if not file.filename.endswith(('.pdf', '.docx')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload PDF or DOCX.")
    
    try:
        contents = await file.read()
        
        if file.filename.endswith('.pdf'):
            text = extract_text_from_pdf(contents)
        else:
            text = extract_text_from_docx(contents)
            
        # Comprehensive Skill Extraction Logic
        TECHNICAL_SKILLS = {
            # Languages
            "python", "java", "javascript", "typescript", "c++", "c#", "golang", "rust", "swift", "kotlin", "php", "ruby", "scala",
            # Frontend
            "react", "angular", "vue.js", "vue", "next.js", "nuxt.js", "svelte", "html", "css", "sass", "tailwind", "bootstrap",
            # Backend
            "node.js", "express", "django", "flask", "fastapi", "spring boot", "ruby on rails", "asp.net", "graphql",
            # Database
            "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch", "cassandra", "firebase", "sqlite",
            # DevOps & Cloud
            "docker", "kubernetes", "aws", "azure", "gcp", "google cloud", "terraform", "jenkins", "circleci", "git", "linux", "bash",
            # AI/Data
            "machine learning", "deep learning", "nlp", "tensorflow", "pytorch", "pandas", "numpy", "scikit-learn", "keras", "opencv", "spark", "hadoop",
            # Tools & Others
            "jira", "agile", "scrum", "figma", "adobe xd", "selenium", "jest", "cypress"
        }
        
        import re
        text_lower = text.lower()
        extracted_skills = set()
        
        for skill in TECHNICAL_SKILLS:
            # Use word boundary to ensure exact matches
            pattern = r'\b' + re.escape(skill) + r'\b'
            if re.search(pattern, text_lower):
                # Format: Capitalize words
                formatted = " ".join(word.capitalize() for word in skill.split())
                # Specific corrections
                if formatted.lower() == "javascript": formatted = "JavaScript"
                if formatted.lower() == "typescript": formatted = "TypeScript"
                if formatted.lower() == "mysql": formatted = "MySQL"
                if formatted.lower() == "postgresql": formatted = "PostgreSQL"
                if formatted.lower() == "mongodb": formatted = "MongoDB"
                if formatted.lower() == "react": formatted = "React"
                if formatted.lower() == "vue": formatted = "Vue.js"
                if formatted.lower() == "node.js": formatted = "Node.js"
                
                extracted_skills.add(formatted)

        return {
            "filename": file.filename,
            "extracted_skills": sorted(list(extracted_skills)), 
            "text_preview": text[:500] 
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- AUTHENTICATION ---

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    secret_key: Optional[str] = None

@app.post("/register", status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check existing
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    # Strict Email Validation
    import re
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, user.email) or '..' in user.email or user.email.count('@') > 1:
         raise HTTPException(status_code=400, detail="Invalid email format")
         
    # Basic check for repeated TLDs like .com.com which technically might be valid DNS but usually user error
    domain_part = user.email.split('@')[-1]
    if domain_part.endswith('.com.com') or domain_part.endswith('.co.co'):
         raise HTTPException(status_code=400, detail="Invalid email format (repeated TLD)")
    
    # Create new user
    hashed_pwd = get_password_hash(user.password)
    # Auto-assign admin role for the specific email
    role = "admin" if user.email == "uresha498@gmail.com" else "user"
    
    new_user = User(
        email=user.email, 
        hashed_password=hashed_pwd, 
        full_name=user.full_name,
        role=role,
        last_active=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    log_event(db, "INFO", f"New user registered: {new_user.email}")

    return {"id": new_user.id, "email": new_user.email, "full_name": new_user.full_name, "avatar_id": new_user.avatar_id, "role": new_user.role}

@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    print(f"Login Attempt: {user.email}")
    try:
        db_user = db.query(User).filter(User.email == user.email).first()
        
        if not db_user:
            print("User not found")
            raise HTTPException(status_code=401, detail="User not found")
            
        print(f"Checking password for {user.email}. Payload pwd len: {len(user.password)}, DB hash len: {len(db_user.hashed_password)}")
        if not verify_password(user.password, db_user.hashed_password):
            print("Password mismatch")
            raise HTTPException(status_code=401, detail="Invalid credentials (Password mismatch)")
            
        # CHECK IF DELETED
        if db_user.is_deleted:
             raise HTTPException(status_code=403, detail="Account disabled/deleted. Contact Admin.")
        
        # ADMIN 2FA CHECK
        if db_user.role == "admin":
            print(f"Admin login detected. Secret provided: '{user.secret_key}'")
            if user.secret_key != "200207":
                print(f"Secret key mismatch. Expected '200207', got '{user.secret_key}'")
                raise HTTPException(status_code=403, detail="REQUIRE_SECRET_KEY")

        # Update Last Active
        db_user.last_active = datetime.utcnow()
        db.commit()

        # Log Event
        log_event(db, "INFO", f"User logged in: {db_user.email} ({db_user.role})")
        
        return {
            "id": db_user.id, 
            "email": db_user.email, 
            "full_name": db_user.full_name, 
            "avatar_id": db_user.avatar_id, 
            "role": db_user.role,
            "token": "fake-jwt-token-for-demo"
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Login Failed: {str(e)}")

@app.get("/auth/verify/{user_id}")
def verify_user_status(user_id: int, db: Session = Depends(get_db)):
    """Check if user user still exists and is active. Used for client-side auto-logout."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_deleted:
        raise HTTPException(status_code=403, detail="Account deleted")
    
    # Update last_active on this heartbeat
    user.last_active = datetime.utcnow()
    db.commit()
    return {"status": "active"}


# --- ADMIN ENDPOINTS ---

@app.get("/admin/stats")
def get_admin_stats(db: Session = Depends(get_db)):
    # Exclude admins from stats
    total_users = db.query(User).filter(User.role != 'admin').count()
    
    # Active in last 24h (excluding admins)
    active_boundary = datetime.utcnow() - timedelta(days=1)
    active_users = db.query(User).filter(User.role != 'admin', User.last_active >= active_boundary).count()
    
    # For now, we don't track total unique resumes scanned in DB. 
    # Returning a placeholder or 0 to be accurate to "DB state".
    # In a real app, we would log every scan to a 'ScanLog' table.
    total_resumes = 0 
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_resumes": total_resumes
    }

@app.get("/admin/users")
def get_all_users(db: Session = Depends(get_db)):
    # show active only
    users = db.query(User).filter(User.is_deleted == False).all()
    
    # Calculate online status (active < 30 seconds ago for near real-time)
    now = datetime.utcnow()
    user_list = []
    
    for u in users:
        # Changed from 5 minutes to 30 seconds as requested
        is_online = u.last_active and (now - u.last_active < timedelta(seconds=35))
        user_list.append({
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "is_online": bool(is_online),
            # Ensure "Z" is appended to indicate UTC
            "last_active": (u.last_active.isoformat() + "Z") if u.last_active else None
        })
    
    # SORTING: Online First, Then Last Active Recent First
    user_list.sort(key=lambda x: (not x['is_online'], x['last_active'] or ""), reverse=False)
    # Explanation: is_online=True is False in 'not'. True < False? No. False < True.
    # We want True (Online) first.
    # Let's use reverse=True logic:
    # Key: (is_online, last_active). True > False. So Online first. 
    user_list.sort(key=lambda x: (x['is_online'], x['last_active'] or ""), reverse=True)

    return user_list

@app.get("/admin/users/deleted")
def get_deleted_users(db: Session = Depends(get_db)):
    users = db.query(User).filter(User.is_deleted == True).all()
    return [{
        "id": u.id,
        "full_name": u.full_name,
        "email": u.email,
        "role": u.role,
        "deletion_reason": u.deletion_reason,
        "last_active": (u.last_active.isoformat() + "Z") if u.last_active else None
    } for u in users]

class DeleteUserRequest(BaseModel):
    reason: str

@app.post("/admin/users/{user_id}/delete")
def delete_user_soft(user_id: int, req: DeleteUserRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent Admin Self-Delete handled in Frontend likely, but backend check good
    if user.role == "admin" and user.email == "admin@example.com":
         raise HTTPException(status_code=400, detail="Cannot delete main admin")

    user.is_deleted = True
    user.deletion_reason = req.reason
    db.commit()
    log_event(db, "WARN", f"User deleted: {user.email}. Reason: {req.reason}")
    return {"message": "User deleted successfully"}

@app.post("/admin/users/{user_id}/restore")
def restore_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_deleted = False
    user.deletion_reason = None
    db.commit()
    log_event(db, "INFO", f"User restored: {user.email}")
    return {"message": "User restored successfully"}


# --- JOB MANAGEMENT (ADMIN) ---

class JobCreate(BaseModel):
    title: str
    company: str
    location: str
    description: str
    skills_required: str
    contract_type: str = "full_time"
    url: Optional[str] = None

@app.get("/admin/jobs")
def get_admin_jobs(db: Session = Depends(get_db)):
    return db.query(JobPost).order_by(JobPost.date_posted.desc()).all()

@app.get("/admin/logs")
def get_admin_logs(db: Session = Depends(get_db)):
    # Returns last 50 logs
    logs = db.query(SystemLog).order_by(SystemLog.timestamp.desc()).limit(50).all()
    return [{
        "id": l.id,
        "level": l.level,
        "message": l.message,
        "timestamp": (l.timestamp.isoformat() + "Z") if l.timestamp else None
    } for l in logs]

@app.delete("/admin/logs")
def clear_system_logs(db: Session = Depends(get_db)):
    db.query(SystemLog).delete()
    db.commit()
    # Add one log entry that logs were cleared
    log_event(db, "SYSTEM", "System logs cleared by Admin")
    return {"message": "Logs cleared"}

@app.post("/admin/jobs")
def create_job(job: JobCreate, db: Session = Depends(get_db)):
    new_job = JobPost(
        title=job.title,
        company=job.company,
        location=job.location,
        description=job.description,
        skills_required=job.skills_required,
        contract_type=job.contract_type,
        url=job.url,
        date_posted=datetime.utcnow(),
        source="Internal Admin"
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    log_event(db, "SYSTEM", f"New job posted: {new_job.title} at {new_job.company}")
    return new_job

@app.delete("/admin/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(JobPost).filter(JobPost.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    title = job.title
    db.delete(job)
    db.commit()
    log_event(db, "WARN", f"Job deleted: {title}")
    return {"message": "Job deleted successfully"}

class UpdateProfile(BaseModel):
    user_id: int
    full_name: str
    avatar_id: int

class MessageCreate(BaseModel):
    user_id: int
    user_name: str
    user_email: str
    content: str

@app.post("/contact")
def send_message(msg: MessageCreate, db: Session = Depends(get_db)):
    new_msg = Message(
        user_id=msg.user_id,
        user_name=msg.user_name,
        user_email=msg.user_email,
        content=msg.content,
        timestamp=datetime.utcnow()
    )
    db.add(new_msg)
    db.commit()
    log_event(db, "INFO", f"Message received from {msg.user_email}")
    return {"message": "Message sent successfully"}

@app.get("/admin/messages")
def get_admin_messages(db: Session = Depends(get_db)):
    msgs = db.query(Message).order_by(Message.timestamp.desc()).all()
    return [{
        "id": m.id,
        "user_id": m.user_id,
        "user_name": m.user_name,
        "user_email": m.user_email,
        "content": m.content,
        "is_replied": m.is_replied,
        "timestamp": (m.timestamp.isoformat() + "Z") if m.timestamp else None
    } for m in msgs]

class ReplyMessage(BaseModel):
    user_email: str
    subject: str
    content: str
    original_message_id: Optional[int] = None

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

@app.post("/admin/reply")
def reply_to_message(reply: ReplyMessage, db: Session = Depends(get_db)):
    # Try to send real email if credentials exist
    smtp_server = "smtp.gmail.com"
    smtp_port = 587
    sender_email = os.getenv("MAIL_USERNAME")
    sender_password = os.getenv("MAIL_PASSWORD")

    email_sent = False
    
    if sender_email and sender_password:
        try:
            msg = MIMEMultipart()
            msg['From'] = sender_email
            msg['To'] = reply.user_email
            msg['Subject'] = reply.subject
            msg.attach(MIMEText(reply.content, 'plain'))

            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(sender_email, sender_password)
            text = msg.as_string()
            server.sendmail(sender_email, reply.user_email, text)
            server.quit()
            
            email_sent = True
            log_event(db, "INFO", f"Email sent to {reply.user_email}")
            print(f"SUCCESS: Real email sent to {reply.user_email}")
        except Exception as e:
            print(f"SMTP ERROR: {e}")
            log_event(db, "ERROR", f"Failed to send email to {reply.user_email}: {e}")
            # Fallback to mock
            email_sent = False

    if not email_sent:
        print("="*30)
        print(" [MOCK EMAIL SERVICE] ")
        print(f" TO: {reply.user_email}")
        print(f" SUBJ: {reply.subject}")
        print(f" BODY: {reply.content}")
        print("="*30)
        log_event(db, "INFO", f"Simulated reply to {reply.user_email}")
        
    # Mark original message as replied
    if reply.original_message_id:
        original_msg = db.query(Message).filter(Message.id == reply.original_message_id).first()
        if original_msg:
            original_msg.is_replied = True
            db.commit()

    if not email_sent:
        return {"message": "Reply logged (Real email requires SMTP config)"}

    return {"message": "Reply sent successfully"}

@app.delete("/admin/messages/{message_id}")
def delete_message(message_id: int, db: Session = Depends(get_db)):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    
    db.delete(msg)
    db.commit()
    return {"message": "Message deleted successfully"}

class ChangePassword(BaseModel):
    user_id: int
    current_password: str
    new_password: str

@app.put("/update_profile")
def update_profile(data: UpdateProfile, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == data.user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_user.full_name = data.full_name
    db_user.avatar_id = data.avatar_id
    db.commit()
    db.refresh(db_user)
    return {"id": db_user.id, "email": db_user.email, "full_name": db_user.full_name, "avatar_id": db_user.avatar_id}

@app.put("/change_password")
def change_password(data: ChangePassword, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == data.user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not verify_password(data.current_password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    db_user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@app.post("/search_jobs")
def search_jobs(skills: List[str], contract_type: str = "full_time", db: Session = Depends(get_db)):
    from datetime import datetime, timedelta
    
    # 1. Local Database Search
    # Filter out jobs older than 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    query = db.query(JobPost).filter(
        JobPost.contract_type == contract_type,
        JobPost.date_posted >= thirty_days_ago
    )
    
    # Filter by at least one skill matching (simple implementation)
    jobs = query.all()
    
    local_matches = []
    keywords = [s.lower() for s in skills]
    
    for job in jobs:
        # Avoid potential None types
        job_skills = (job.skills_required or "").lower()
        job_desc = (job.description or "").lower()
        score = 0
        for k in keywords:
            if k in job_skills or k in job_desc:
                score += 1
        
        if score > 0:
            local_matches.append(job)
    
    # Sort by relevance
    local_matches.sort(key=lambda j: sum(1 for k in keywords if k in (j.skills_required or "").lower()), reverse=True)

    # 2. External Platform Matches (Dynamic Multi-Platform)
    api_matches = []
    
    # Map extracted skills to generic Job Role Titles
    roles_map = {
        "python": "Python Developer",
        "django": "Python Backend Developer", 
        "fastapi": "Python Engineer",
        "react": "React Developer",
        "javascript": "Frontend Developer",
        "typescript": "Frontend Developer",
        "node.js": "Node.js Developer",
        "java": "Java Developer",
        "spring": "Java Developer",
        "machine learning": "Machine Learning Engineer",
        "tensorflow": "AI Engineer",
        "data": "Data Analyst",
        "sql": "Database Administrator",
        "devops": "DevOps Engineer",
        "docker": "DevOps Engineer",
        "aws": "Cloud Engineer",
        "figma": "UI/UX Designer"
    }
    
    # Identify distinct target roles based on skills
    start_roles = set()
    found_any = False
    
    for k in keywords:
        for skill_key, role_name in roles_map.items():
            if skill_key in k:
                start_roles.add(role_name)
                found_any = True
                
    # Fallback if no specific map found but we have skills
    if not found_any and keywords:
         # Use the first valid skill as a role name
         valid_skill = next((k for k in keywords if len(k) > 2), "Software")
         start_roles.add(f"{valid_skill.title()} Developer")
    elif not keywords:
        start_roles.add("Software Engineer")
             
    # Limit to top 3 roles to keep UI clean
    target_roles = list(start_roles)[:3]

    def get_links(role_name, c_type):
        links = []
        is_intern = (c_type == "internship")
        
        # --- 1. LinkedIn (Global/Standard) ---
        # Query: "Python Developer Internship" or "Python Developer"
        q_linkedin = f"{role_name} { 'Internship' if is_intern else ''}".strip().replace(" ", "%20")
        links.append({
            "title": f"{role_name} { '(Intern)' if is_intern else ''}",
            "company": "LinkedIn Jobs",
            "source": "LinkedIn",
            "location": "Remote / Worldwide",
            "description": f"Browse active {'internship ' if is_intern else ''}listings for {role_name} on LinkedIn.",
            "url": f"https://www.linkedin.com/jobs/search/?keywords={q_linkedin}"
        })

        # --- 2. Platform Specific (Internshala vs Indeed) ---
        if is_intern:
            # Internshala: https://internshala.com/internships/keywords-python
            # They use keywords-role-name format
            q_internshala = role_name.lower().replace(" ", "-") 
            links.append({
                "title": f"{role_name} Opportunity",
                "company": "Internshala",
                "source": "Internshala",
                "location": "India / Remote",
                "description": "Apply to verified internships on Internshala.",
                "url": f"https://internshala.com/internships/keywords-{q_internshala}"
            })
        else:
            # Indeed: https://www.indeed.com/jobs?q=python+developer
            q_indeed = role_name.replace(" ", "+")
            links.append({
                "title": f"{role_name} Positions",
                "company": "Indeed",
                "source": "Indeed",
                "location": "Flexible",
                "description": f"Find {role_name} jobs across top companies on Indeed.",
                "url": f"https://www.indeed.com/jobs?q={q_indeed}"
            })
            
        return links

    for role in target_roles:
        generated = get_links(role, contract_type)
        api_matches.extend(generated)

    return {
        "local_matches": local_matches,
        "api_matches": api_matches
    }

# --- ATS CHECKER ---

class ATSRequest(BaseModel):
    resume_text: str
    job_description: str

@app.post("/ats_check")
def ats_check(data: ATSRequest):
    import re
    # 1. Robust Stop Words
    stop_words = {
        'and', 'the', 'is', 'in', 'to', 'for', 'with', 'a', 'an', 'of', 'on', 'at', 'by', 'from',
        'about', 'as', 'into', 'like', 'through', 'after', 'over', 'between', 'out', 'against',
        'during', 'without', 'before', 'under', 'around', 'among', 'can', 'will', 'just', 'don',
        'should', 'now', 'that', 'this', 'what', 'which', 'who', 'whom', 'experience', 'work',
        'years', 'knowledge', 'skills', 'ability', 'strong', 'proficiency', 'understanding',
        'excellent', 'working', 'proven', 'track', 'record', 'degree', 'preferred', 'plus',
        'responsibilities', 'qualifications', 'requirements', 'must', 'have', 'be', 'able',
        'good', 'communication', 'team', 'environment', 'flexible', 'role', 'candidate',
        'looking', 'seeking', 'opportunity', 'company', 'business', 'support', 'ensure',
        'help', 'provide', 'using', 'best', 'practices', 'development', 'design', 'implementation',
        'including', 'various', 'across', 'within', 'related', 'however', 'although', 'such', 'other'
    }

    def clean_text(text):
        # Keep only alphanumeric and spaces, lowercase
        return re.sub(r'[^a-z0-9\s]', '', text.lower())

    jd_text = clean_text(data.job_description)
    resume_text = clean_text(data.resume_text)

    jd_words = jd_text.split()
    
    # Extract Significant Keywords (Frequency > 0, filtering stop words)
    significant_keywords = set()
    for w in jd_words:
        if len(w) > 3 and w not in stop_words:
            significant_keywords.add(w)

    # 2-gram extraction for JD (basic context)
    for i in range(len(jd_words) - 1):
        w1 = jd_words[i]
        w2 = jd_words[i+1]
        if w1 not in stop_words and w2 not in stop_words and len(w1) > 2 and len(w2) > 2:
             gram = f"{w1} {w2}"
             significant_keywords.add(gram)

    if not significant_keywords:
        return {"score": 0, "matched_keywords": [], "missing_keywords": []}

    matched = []
    missing = []

    # Scoring Logic
    match_count = 0
    total_weight = len(significant_keywords)
    
    for kw in significant_keywords:
        # Check if the keyword/phrase exists in the full resume text
        if kw in resume_text: 
            matched.append(kw)
            match_count += 1
        else:
            missing.append(kw)

    # Calculation
    raw_percentage = (match_count / max(total_weight, 1)) * 100
    
    # Boost Logic: ATS scores are often harsh. We apply a curve.
    # If you match 30% of distinct keywords, that's actually decent for a human resume vs JD.
    # We map 0-40% raw -> 0-60% final
    # 40-100% raw -> 60-100% final
    
    if raw_percentage <= 40:
        final_score = raw_percentage * 1.5
    else:
        final_score = 60 + ((raw_percentage - 40) / 60) * 40
    
    final_score = min(int(final_score), 100)

    # Sort keywords by length (longer phrases usually more interesting)
    matched.sort(key=len, reverse=True)
    missing.sort(key=len, reverse=True)

    return {
        "score": final_score,
        "matched_keywords": matched[:20], # Top 20
        "missing_keywords": missing[:20]  # Top 20
    }

# --- SERVE STATIC FRONTEND FILES ---

# CRITICAL: This MUST be the last route in your file.
# It tells FastAPI to try and find a static file (like index.html)
# in the '../frontend/dist' directory for any path not handled above.
# The path must be relative to the Root Directory on Render (which is 'backend').

# Serve React Frontend (Production Build) - ONLY IF EXISTS
frontend_dist = "../frontend/dist"

@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow()}

if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")
else:
    @app.get("/")
    def read_root():
        return {"message": "Backend API is Online. Frontend static files not found (looking in ../frontend/dist)."}
    print(f"WARNING: Frontend static files not found at {frontend_dist}. API-only mode (OK for local dev).")
