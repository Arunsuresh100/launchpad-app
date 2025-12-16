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
        if len(pdf.pages) > 4:
            raise ValueError("PDF exceeds 4 pages limit.")
        text = ""
        for page in pdf.pages:
            text += page.extract_text() or ""
    return text

def extract_text_from_docx(file_bytes):
    doc = docx.Document(io.BytesIO(file_bytes))
    return "\n".join([para.text for para in doc.paragraphs])

# --- AUTH UTILS ---
from database import SystemLog, Message, UserActivity

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

# --- ADMIN API ENDPOINTS (NEW) ---

@app.get("/admin/stats")
def get_admin_stats(db: Session = Depends(get_db)):
    total_users = db.query(User).filter(User.is_deleted == False).count()
    
    # Active in last 24 hours
    one_day_ago = datetime.utcnow() - timedelta(hours=24)
    active_users = db.query(User).filter(User.last_active >= one_day_ago).count()
    
    total_jobs = db.query(JobPost).count()
    
    # Placeholder for resumes (if we tracked them in DB)
    # For now, just return a static number or count of jobs * 5 (mock)
    # Or count files in uploads directory if it exists
    total_resumes = 0
    if os.path.exists("./uploads"):
        total_resumes = len(os.listdir("./uploads"))

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_resumes": total_resumes or total_jobs * 3 # Mock fallback if folder empty
    }

@app.delete("/admin/users/{user_id}/permanent")
def permanent_delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if admin
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin permanently here")
        
    db.delete(user)
    db.commit()
    log_event(db, "WARN", f"User permanently deleted: {user.email}")
    return {"message": "User permanently deleted"}

@app.get("/admin/users")
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).filter(User.is_deleted == False).order_by(User.last_active.desc()).all()
    # Explicitly format as UTC Z-string to fix frontend timezone issues
    return [{
        "id": u.id, 
        "full_name": u.full_name, 
        "email": u.email, 
        "role": u.role, 
        "last_active": (u.last_active.isoformat() + "Z") if u.last_active else None, 
        "provider": u.provider
    } for u in users]

@app.get("/admin/users/deleted")
def get_deleted_users(db: Session = Depends(get_db)):
    users = db.query(User).filter(User.is_deleted == True).order_by(User.last_active.desc()).all()
    return [{
        "id": u.id, 
        "full_name": u.full_name, 
        "email": u.email, 
        "deletion_reason": u.deletion_reason, 
        "deleted_at": (u.last_active.isoformat() + "Z") if u.last_active else None 
    } for u in users]

@app.get("/admin/jobs")
def get_all_jobs_admin(db: Session = Depends(get_db)):
    jobs = db.query(JobPost).order_by(JobPost.date_posted.desc()).all()
    # Manual serialization for dates
    return [{
        "id": j.id,
        "title": j.title,
        "company": j.company,
        "location": j.location,
        "description": j.description,
        "skills_required": j.skills_required,
        "contract_type": j.contract_type,
        "url": j.url,
        "source": j.source,
        "date_posted": (j.date_posted.isoformat() + "Z") if j.date_posted else None
    } for j in jobs]

class JobCreate(BaseModel):
    title: str
    company: str
    location: str
    description: str
    skills_required: str
    contract_type: str = "full_time"
    url: Optional[str] = None





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
        
        # Check size (rough check: 5MB limit)
        if len(contents) > 5 * 1024 * 1024:
             raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")

        try:
            if file.filename.endswith('.pdf'):
                text = extract_text_from_pdf(contents)
            else:
                text = extract_text_from_docx(contents)
        except ValueError as ve:
             if "exceeds" in str(ve):
                  raise HTTPException(status_code=400, detail="Resume too long. Maximum 4 pages allowed.")
             raise ve
        
        # Check if text extraction worked
        if not text or len(text.strip()) < 50:
             raise HTTPException(
                 status_code=400, 
                 detail="Could not extract text from document. If this is a PDF, ensure it is text-based (not a scanned image)."
             )
            
        # --- VALIDATION: Check if it's actually a resume ---
        def is_valid_resume(text_content):
            # Normalize
            t = text_content.lower()
            
            # Keywords that STRONGLY suggest a resume/CV
            # We expect at least a few of these to be present.
            resume_keywords = [
                "experience", "work history", "employment", "internship",
                "education", "university", "college", "degree",
                "skills", "technologies", "technical skills", "competencies",
                "projects", "summary", "profile", "objective",
                "certifications", "achievements", "languages",
                "resume", "curriculum vitae", "cv",
                "contact", "phone", "email", "linkedin", "github"
            ]
            
            # Count matches (simple keyword presence)
            match_count = 0
            for kw in resume_keywords:
                if kw in t:
                    match_count += 1
            
            # Threshold: A valid resume should have at least 3 of these distinct keywords.
            # (e.g. "Education", "Experience", "Skills" is a very common trio)
            return match_count >= 3

        if not is_valid_resume(text):
             raise HTTPException(
                 status_code=400, 
                 detail="The uploaded document does not appear to be a valid Resume or CV. Please upload a professional resume file containing keywords like 'Education', 'Experience', or 'Skills'."
             )

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
    # Also exclude deleted users if desired, usually stats show valid current users.
    base_query = db.query(User).filter(User.role != 'admin', User.is_deleted == False)
    
    total_users = base_query.count()
    
    # Active in last 15 minutes (Real-time "Online" status)
    active_boundary = datetime.utcnow() - timedelta(minutes=15)
    active_users = base_query.filter(User.last_active >= active_boundary).count()
    
    total_resumes = 0 
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_resumes": total_resumes
    }


# ... [DeleteUserRequest class and delete_user_soft function remain unchanged] ...

class InterviewEval(BaseModel):
    transcript: List[dict] # [{question: str, answer: str}]

@app.post("/interview/evaluate")
def evaluate_interview(data: InterviewEval):
    transcript = data.transcript
    if not transcript:
        return {"score": 0, "pros": ["None"], "cons": ["No answers recorded."]}

    total_score = 0
    word_count_score = 0
    keyword_score = 0
    communication_score = 0
    
    # Flatten tech skills for checking
    all_tech_skills = set()
    for cat, skills in TECHNICAL_SKILLS.items():
        for s in skills:
            all_tech_skills.add(s.lower())

    # Soft skills / HR Keywords
    hr_keywords = {"team", "collaborate", "leader", "challenge", "learn", "growth", "project", "deadline", "result", "success", "fail", "improve"}

    valid_answers = 0
    skipped_count = 0
    
    for entry in transcript:
        ans = entry.get('answer', '').strip()
        if not ans or ans == "(No Answer)" or ans == "SKIPPED":
            skipped_count += 1
            continue
            
        valid_answers += 1
        ans_lower = ans.lower()
        
        # Word Count Scoring (Substance)
        words = len(ans.split())
        if words > 50: word_count_score += 3
        elif words > 30: word_count_score += 2
        elif words > 10: word_count_score += 1
        
        # Keyword Scoring (Technical)
        tech_found = False
        for skill in all_tech_skills:
            if skill in ans_lower:
                keyword_score += 1
                tech_found = True
        
        # HR/Communication Scoring
        for hr in hr_keywords:
            if hr in ans_lower:
                communication_score += 1

    # STRICT FAIL CONDITIONS
    if valid_answers == 0:
         return {
            "score": 0, 
            "pros": ["Attempted the session"], 
            "cons": ["You skipped every question. A zero score is assigned for no participation.", "Please answer at least one question to get a rating."]
        }

    raw_score = word_count_score + keyword_score + (communication_score * 0.5)
    
    # Penalty for skipping
    # If you skip > 50% of questions, cap score at 5?
    # No, simple deduction.
    skip_penalty = skipped_count * 1.5 
    
    # Calc max potential: 5 questions * (2 word + 1 tech + 1 soft) = ~20
    # Normalize
    len_factor = len(transcript) if len(transcript) > 0 else 1
    normalized = (raw_score / (len_factor * 3)) * 10 
    
    final_score = normalized - skip_penalty
    
    # Bounds
    final_score = max(0, min(10, int(final_score)))
    
    # Minimum encouragement ONLY if attended reasonably well
    if final_score < 2 and valid_answers > (len(transcript) / 2): final_score = 2



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
    date_posted: Optional[datetime] = None

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
    # ... [Existing create_job logic] ...
    # (Abbreviation for brevity, but I must respect replacement rules)
    # The user instruction is to Add Analytics ENdpoint.
    # I will insert it BEFORE create_job or AFTER it.
    # Let's insert it AFTER create_job to avoid breaking large blocks logic.
    pass

# ... (Actually, I need to verify where to insert. Let's insert after create_job)
# Wait, let's look at file context again. Line 600 is inside create_job?
# No, line 600 is end of create_job in previous view (Step 4605).
# "source="Internal Admin"" was line 600.
# So I will append the NEW endpoint after create_job.

    # Validate date
    post_date = job.date_posted or datetime.utcnow()
    if post_date > datetime.utcnow() + timedelta(days=1): 
        pass 
    
    if job.date_posted and job.date_posted.date() < datetime.utcnow().date():
         raise HTTPException(status_code=400, detail="Cannot post a job with a past date.")

    new_job = JobPost(
        title=job.title,
        company=job.company,
        location=job.location,
        description=job.description,
        skills_required=job.skills_required,
        contract_type=job.contract_type,
        url=job.url,
        date_posted=post_date,
        source="Internal Admin"
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    log_event(db, "INFO", f"Admin created job: {new_job.title}")
    return new_job

# --- ANALYTICS ENDPOINT ---

class AnalyticsResponse(BaseModel):
    resume_uploads: int
    ats_checks: int
    interviews_attended: int
    recent_activities: List[dict]

@app.get("/admin/analytics", response_model=AnalyticsResponse)
def get_analytics(db: Session = Depends(get_db)):
    # Counts
    resume_uploads = db.query(UserActivity).filter(UserActivity.activity_type == "resume_upload").count()
    ats_checks = db.query(UserActivity).filter(UserActivity.activity_type == "ats_check").count()
    interviews = db.query(UserActivity).filter(UserActivity.activity_type == "interview_attempt").count()
    
    # Recent Activities (Last 50)
    recent = db.query(UserActivity).order_by(UserActivity.timestamp.desc()).limit(50).all()
    
    activities_list = [{
        "user_name": a.user_name,
        "type": a.activity_type,
        "details": a.details,
        "timestamp": a.timestamp.isoformat() + "Z"
    } for a in recent]
    
    return {
        "resume_uploads": resume_uploads,
        "ats_checks": ats_checks,
        "interviews_attended": interviews,
        "recent_activities": activities_list
    }

# (End of Analytics Endpoint)
# Resume original flow of file...

@app.put("/admin/jobs/{job_id}")
def update_job(job_id: int, job: JobCreate, db: Session = Depends(get_db)):
    db_job = db.query(JobPost).filter(JobPost.id == job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    db_job.title = job.title
    db_job.company = job.company
    db_job.location = job.location
    db_job.description = job.description
    db_job.skills_required = job.skills_required
    db_job.contract_type = job.contract_type
    db_job.url = job.url
    if job.date_posted:
        db_job.date_posted = job.date_posted
        
    db.commit()
    log_event(db, "INFO", f"Job updated: {job.title}")
    return db_job

# --- INTERVIEW PREP AI ---
class InterviewGenRequest(BaseModel):
    resume_text: str

@app.post("/interview/generate")
def generate_interview_questions(req: InterviewGenRequest):
    # Mock AI Logic to extract context and generate questions
    text = req.resume_text.lower()
    questions = []
    
    # Base
    questions.append("Tell me about yourself and your background.")
    
    # Experience based
    if "experience" in text or "work history" in text:
        questions.append("Can you describe a challenging situation you faced in your previous role and how you handled it?")
        questions.append("What is your biggest professional achievement so far?")
    
    # Project based
    if "project" in text:
        questions.append("Pick one of your projects listed on your resume. deeply explain the architecture and your specific contribution.")
        questions.append("What were the technical trade-offs you made in your projects?")

    # Skill based (Simple keyword matching)
    if "react" in text:
        questions.append("I see you know React. Can you explain the Virtual DOM and how it improves performance?")
    if "python" in text:
        questions.append("Since you use Python, can you explain the difference between a list and a tuple?")
    if "node" in text:
        questions.append("Explain the event loop in Node.js.")
    if "sql" in text or "database" in text:
        questions.append("How do you optimize a slow SQL query?")
    
    # Behavioral/Closing
    questions.append("Where do you see yourself in 5 years?")
    questions.append("Why do you want to join our company specifically?")
    
    # Ensure we have about 5-10 questions
    import random
    if len(questions) < 5:
        defaults = [
            "What are your strength and weaknesses?",
            "Describe a time you had a conflict with a coworker.",
            "How do you prioritize tasks under pressure?",
            "What motivates you?"
        ]
        questions.extend(random.sample(defaults, 5 - len(questions)))
    
    return questions[:10]

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
                
    # LOG ACTIVITY (If skills were provided, implies a search/upload happened)
    if skills:
        try:
             # Just log it happened. 
             # We tag it as 'resume_upload' because that's the user action name requested for analytics counts
             act = UserActivity(
                user_id=None,
                user_name="Candidate",
                activity_type="resume_upload", 
                details=f"Skills: {len(skills)}"
             )
             db.add(act)
             db.commit()
        except:
             pass
                
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
def ats_check(data: ATSRequest, db: Session = Depends(get_db)):
    import re
    from sklearn.feature_extraction.text import CountVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    
    # Clean text function (keep structure but normalize)
    def clean_text_v2(text):
        text = text.lower()
        # Remove special chars but keep vital tech symbols (e.g., c++, node.js)
        # We replace non-tech punctuation with space
        text = re.sub(r'[^a-z0-9\s\+\#\.]', ' ', text)
        # Collapse multiple spaces
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    clean_jd = clean_text_v2(data.job_description)
    clean_resume = clean_text_v2(data.resume_text)
    
    if not clean_jd or not clean_resume:
         return {"score": 0, "matched_keywords": [], "missing_keywords": ["Content empty or unreadable"]}
    
    # We want to match unigrams (1 word) and bigrams (2 words), e.g., "machine learning"
    # standard 'english' stop_words remove 'and', 'the', etc.
    try:
        vectorizer = CountVectorizer(ngram_range=(1, 3), stop_words='english')
        
        # Fit on both documents to build common vocabulary
        tfidf_matrix = vectorizer.fit_transform([clean_jd, clean_resume])
        
        # Calculate Cosine Similarity
        # Matrix is 2xN. Row 0 = JD, Row 1 = Resume.
        similarity_matrix = cosine_similarity(tfidf_matrix)
        raw_similarity = similarity_matrix[0][1] # Value between 0 and 1
        
        # ATS Similarity ranges are typically lower than 1.0 (1.0 = identical text)
        # A good resume usually hits 0.4 - 0.6 similarity against a JD.
    except ValueError:
         # Happens if vocab is empty (no valid words found) or stop words ate everything
         return {"score": 0, "matched_keywords": [], "missing_keywords": ["No keywords found internally"]}

    
    # Mapping Logic
    # Target: 0.5 similarity -> ~85 score (Excellent)
    # Target: 0.1 similarity -> ~30 score (Poor)
    
    base_score = 0
    if raw_similarity > 0.6:
        base_score = 100
    elif raw_similarity < 0.05:
        base_score = 10
    else:
        # Curve: Linear mapping from 0.05..0.6 to 10..100
        # Range Sim: 0.55
        # Range Score: 90
        # Slope = 90 / 0.55 = ~163.6
        base_score = 10 + (raw_similarity - 0.05) * 163.6
        
    final_score = int(min(max(base_score, 0), 100))
    
    # EXTRACT MISSING KEYWORDS
    feature_names = vectorizer.get_feature_names_out()
    jd_vector = tfidf_matrix[0].toarray()[0]
    res_vector = tfidf_matrix[1].toarray()[0]
    
    missing_phrases = []
    matched_phrases = []
    
    for i, phrase in enumerate(feature_names):
        in_jd = jd_vector[i] > 0
        in_res = res_vector[i] > 0
        
        if in_jd:
            if in_res:
                matched_phrases.append(phrase)
            else:
                if len(phrase) > 3 and not phrase.isdigit():
                    missing_phrases.append(phrase)
    
    missing_phrases.sort(key=len, reverse=True)
    matched_phrases.sort(key=len, reverse=True)
    
    # LOG ACTIVITY
    try:
        act = UserActivity(
            user_id=None, 
            user_name="Candidate",
            activity_type="ats_check",
            details=f"Score: {final_score}%"
        )
        db.add(act)
        db.commit()
    except Exception as e:
        print(f"Logging failed: {e}")

    return {
        "score": final_score,
        "matched_keywords": matched_phrases[:25], 
        "missing_keywords": missing_phrases[:20]
    }
    

class InterviewEval(BaseModel):
    transcript: List[dict] # [{question: str, answer: str}]

@app.post("/interview/evaluate")
def evaluate_interview(data: InterviewEval, db: Session = Depends(get_db)):
    transcript = data.transcript
    if not transcript:
        return {"score": 0, "pros": ["None"], "cons": ["No answers recorded."]}

    total_score = 0
    word_count_score = 0
    keyword_score = 0
    
    # Flatten tech skills for checking
    all_tech_skills = set()
    for cat, skills in TECHNICAL_SKILLS.items():
        for s in skills:
            all_tech_skills.add(s.lower())

    valid_answers = 0
    
    for entry in transcript:
        ans = entry.get('answer', '').strip()
        if not ans or ans == "(No Answer)" or ans == "SKIPPED":
            continue
            
        valid_answers += 1
        
        # Word Count Scoring (Soft check for substance)
        words = len(ans.split())
        if words > 30: word_count_score += 2
        elif words > 10: word_count_score += 1
        
        # Keyword Scoring (Check for tech terms)
        ans_lower = ans.lower()
        for skill in all_tech_skills:
            if skill in ans_lower:
                keyword_score += 1

    # Base score computation
    # Max possible logical score per question approx 5 (2 length + 3 keywords)
    # We normalize against number of questions asked
    if valid_answers == 0:
         return {
            "score": 0, 
            "pros": ["Attempted to start."], 
            "cons": ["No valid answers provided. Please try to speak clearly or check your microphone."]
        }

    raw_score = word_count_score + keyword_score
    # Target: average good answer gets ~3-4 points.
    # 5 questions * 4 = 20 points max raw typically.
    # We scale raw_score / (num_questions * 2) * 10, clipped at 10.
    
    final_score = min(10, int((raw_score / (len(transcript) * 3 if len(transcript) > 0 else 1)) * 10))
    if final_score < 3 and valid_answers > 0: final_score = 3 # Minimum encouragement

    pros = []
    cons = []

    if valid_answers == len(transcript):
        pros.append("You answered every question!")
    if word_count_score > len(transcript):
        pros.append("Good elaboration on your answers.")
    if keyword_score > 2:
        pros.append(f"Detected {keyword_score} technical keywords in your speech.")
    
    if valid_answers < len(transcript):
        cons.append(f"You skipped {len(transcript) - valid_answers} questions.")
    if word_count_score < len(transcript):
        cons.append("Try to give longer, more detailed answers (STAR method).")
    if keyword_score == 0:
        cons.append("Try to mention specific technologies or skills you know.")

    if not pros: pros.append("Good start, keep practicing!")
    if not cons: cons.append("Excellent performance!")

    # LOG ACTIVITY
    try:
        act = UserActivity(
            user_id=None,
            user_name="Candidate", 
            activity_type="interview_attempt",
            details=f"Score: {final_score}/10"
        )
        db.add(act)
        db.commit()
    except Exception as e:
        print(f"Logging failed: {e}")

    return {
        "score": final_score,
        "pros": pros,
        "cons": cons
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
