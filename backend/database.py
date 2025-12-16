from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Text, Boolean, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime, timedelta
import os

# Set a fallback for local development if needed, 
# but rely on OS environment for deployment
DATABASE_URL = os.getenv("DATABASE_URL")


if not DATABASE_URL:
    # Fallback to local SQLite if DATABASE_URL is not set (e.g., local dev)
    DATABASE_URL = "sqlite:///./jobs_admin_v2.db" 
    print("WARNING: Using local SQLite database. Set DATABASE_URL for production.")

# RENDER/HEROKU Postgre URL fix
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL, 
    pool_pre_ping=True, 
    pool_recycle=300, # Recycle connections every 5 minutes to avoid stale timeouts
    zoom_timeout=30, # Optional: Timeout
    connect_args={
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5
    } if "postgresql" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class JobPost(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    company = Column(String, index=True)
    location = Column(String)
    description = Column(Text)
    skills_required = Column(String) # Comma separated
    source = Column(String, default="Internal Mock DB")
    url = Column(String, nullable=True)
    contract_type = Column(String, default="full_time") # full_time, internship, contractor
    date_posted = Column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    avatar_id = Column(Integer, default=1)
    role = Column(String, default="user") # 'user' or 'admin'
    last_active = Column(DateTime, default=datetime.utcnow)
    provider = Column(String, default="local") # "google", "github", "local"
    reset_token = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_deleted = Column(Boolean, default=False)
    deletion_reason = Column(String, nullable=True)

class SystemLog(Base):
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, index=True)
    level = Column(String) # INFO, WARN, ERROR, SYSTEM
    message = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    user_name = Column(String)
    user_email = Column(String)
    content = Column(String)
    is_replied = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

class UserActivity(Base):
    __tablename__ = "user_activities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True) # Start tracking even for anonymous if needed (but usually logged in)
    user_name = Column(String, default="Anonymous")
    activity_type = Column(String) # 'resume_upload', 'ats_check', 'interview_attempt'
    details = Column(String) # Filename or outcome
    timestamp = Column(DateTime, default=datetime.utcnow)

import bcrypt

def init_db():
    # AUTO-MIGRATION: Check if columns exist, if not add them
    try:
        inspector = inspect(engine)
        columns = [c['name'] for c in inspector.get_columns('users')]
        
        with engine.connect() as conn:
            if 'is_deleted' not in columns:
                print("MIGRATION: Adding is_deleted column...")
                conn.execute(text("ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE"))
            if 'deletion_reason' not in columns:
                print("MIGRATION: Adding deletion_reason column...")
                conn.execute(text("ALTER TABLE users ADD COLUMN deletion_reason VARCHAR"))
            conn.commit()

        # Check for UserActivity table creation (done by create_all usually, but if DB exists, new tables might be missed in some older setups, though create_all handles missing tables)
        # However, create_all does NOT update existing tables (adding columns), hence the manual migration above.
        # But create_all WILL create new tables like user_activities.
    except Exception as e:
        print(f"Migration Check Failed (Ignore if first run): {e}")

    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Seed Jobs
    if db.query(JobPost).count() == 0:
        # Valid Dates
        recent_date = datetime.utcnow()
        old_date = datetime.utcnow() - timedelta(days=60) # Expired

        mock_jobs = [
            JobPost(
                title="Junior Python Developer",
                company="TechCorp",
                location="Remote",
                description="Looking for a junior python dev with FastAPI experience.",
                skills_required="python, fastapi, sql, git",
                contract_type="full_time",
                url="https://www.linkedin.com/jobs/search/?keywords=python%20developer",
                date_posted=recent_date
            ),
            JobPost(
                title="AI Research Intern",
                company="DeepMind Imitation",
                location="London / Remote",
                description="Internship for ML enthusiasts. Experience with PyTorch or TensorFlow.",
                skills_required="python, pytorch, tensorflow, machine learning",
                contract_type="internship",
                url="https://www.google.com/about/careers/applications/jobs/results/?q=AI%20Research%20Intern",
                date_posted=recent_date
            ),
            JobPost(
                title="React Frontend Developer",
                company="WebSolutions",
                location="New York",
                description="Build modern UIs with React and Tailwind.",
                skills_required="react, javascript, tailwind, css",
                contract_type="full_time",
                url="https://www.glassdoor.com/Job/react-developer-jobs-SRCH_KO0,15.htm",
                date_posted=recent_date
            ),
            # EXPIRED JOB (Should be filtered out)
             JobPost(
                title="Legacy PHP dev (Closed)",
                company="OldSchool Inc",
                location="Chicago",
                description="This job should not appear.",
                skills_required="php, html, css",
                contract_type="full_time",
                url="https://example.com/job-closed",
                date_posted=old_date
            )
        ]
        db.add_all(mock_jobs)
        db.commit()

    # Seed Users
    if db.query(User).count() == 0:
        # Admin
        admin_pwd = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        admin_user = User(
            email="admin@example.com",
            full_name="System Admin",
            hashed_password=admin_pwd,
            role="admin",
            avatar_id=1
        )
        db.add(admin_user)
        db.commit()

    db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
