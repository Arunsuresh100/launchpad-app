import spacy
from collections import Counter
import re

# Load English tokenizer, tagger, parser and NER
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Downloading language model...")
    from spacy.cli import download
    download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

def extract_text_from_pdf(pdf_path: str) -> str:
    from pdfminer.high_level import extract_text
    return extract_text(pdf_path)

def extract_skills(text: str):
    doc = nlp(text)
    skills = []
    
    # Predefined list of common tech skills to ensure we catch them (case-insensitive)
    tech_keywords = {
        "python", "java", "javascript", "react", "c++", "c#", "html", "css", 
        "sql", "nosql", "fastapi", "flask", "django", "node.js", "git", "docker", 
        "kubernetes", "aws", "azure", "machine learning", "pytorch", "tensorflow",
        "linux", "php", "ruby", "swift", "kotlin", "go", "rust"
    }
    
    # 1. Direct Keyword Matching
    text_lower = text.lower()
    for keyword in tech_keywords:
        if keyword in text_lower:
            skills.append(keyword.capitalize())

    # 2. NLP Noun Chunks (for other skills)
    stopwords = ["experience", "year", "work", "job", "team", "project", "company", "skills", "education", "summary", "|", ":", "-", "•"]
    
    for token in doc:
        # Clean token text
        clean_text = token.text.strip().replace("|", "").replace("•", "")
        
        if not clean_text:
            continue
            
        if token.pos_ in ["NOUN", "PROPN"] and not token.is_stop and clean_text.lower() not in stopwords:
            # Avoid duplicates if already found by keyword match
            if clean_text.lower() not in tech_keywords:
                 skills.append(clean_text)
            
    # Return top unique skills
    return [item[0] for item in Counter(skills).most_common(15)]

def calculate_ats_score(resume_text: str, job_description: str):
    # 1. Setup Keyword Lists
    tech_keywords = {
        "python", "java", "javascript", "react", "c++", "c#", "html", "css", 
        "sql", "nosql", "fastapi", "flask", "django", "node.js", "git", "docker", 
        "kubernetes", "aws", "azure", "machine learning", "pytorch", "tensorflow",
        "linux", "php", "ruby", "swift", "kotlin", "go", "rust", "angular", "vue",
        "typescript", "mongodb", "postgresql", "mysql", "redis", "elasticsearch",
        "jenkins", "jira", "agile", "scrum", "rest", "api", "graphql", "panda", "numpy"
    }
    
    # Generic nouns to ignore (Noise filter)
    fluff_words = {
        "experience", "year", "work", "job", "team", "project", "company", "skills", 
        "education", "summary", "role", "candidate", "responsibilities", "requirements",
        "ability", "understanding", "opportunity", "world", "application", "business",
        "knowledge", "environment", "degree", "field", "practice", "solutions",
        "communication", "description", "qualifications", "industry", "support"
    }
    
    # 2. Extract Terms from JD
    doc_jd = nlp(job_description)
    
    critical_keywords = set()
    standard_keywords = set()
    
    for token in doc_jd:
        text_lower = token.text.lower()
        
        # Skip weird stuff
        if not token.is_alpha or token.is_stop or text_lower in fluff_words:
            continue
            
        # Check if it's a known tech skill (Critical)
        if text_lower in tech_keywords:
            critical_keywords.add(text_lower)
        # Else if it's a noun/propn (Standard)
        elif token.pos_ in ["NOUN", "PROPN"]:
            standard_keywords.add(text_lower)
            
    # 3. Check Overlap
    resume_lower = resume_text.lower()
    
    matched_critical = {k for k in critical_keywords if k in resume_lower}
    matched_standard = {k for k in standard_keywords if k in resume_lower}
    
    missing_critical = critical_keywords - matched_critical
    missing_standard = standard_keywords - matched_standard
    
    # 4. Calculate Weighted Score
    # Weights: Critical = 3 points, Standard = 1 point
    total_points = (len(critical_keywords) * 3) + len(standard_keywords)
    earned_points = (len(matched_critical) * 3) + len(matched_standard)
    
    if total_points == 0:
        return 0, [], []
        
    raw_score = (earned_points / total_points) * 100
    
    # AI Boost: If you matched most critical skills, that's what matters most.
    # Curve the score: x^(0.8) to boost mid-range scores
    # e.g., 50% -> 57%, 80% -> 83%
    # Actually, let's simply boost if critical coverage is high
    
    final_score = raw_score
    
    # If we have 100% of critical skills, ensure score is at least 90
    if critical_keywords and len(matched_critical) == len(critical_keywords):
        final_score = max(final_score, 90)
    elif critical_keywords and (len(matched_critical) / len(critical_keywords)) > 0.8:
        final_score = max(final_score, 85)
        
    return round(final_score, 1), list(matched_critical.union(matched_standard)), list(missing_critical) # prioritize showing missing critical?
