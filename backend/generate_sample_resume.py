from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

def create_sample_resume(filename="sample_resume.pdf"):
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter

    # Title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, height - 50, "John Doe")
    c.setFont("Helvetica", 10)
    c.drawString(100, height - 65, "Email: johndoe@example.com | Phone: 123-456-7890")
    
    # Skills Section
    c.setFont("Helvetica-Bold", 12)
    c.drawString(100, height - 100, "Skills")
    c.line(100, height - 102, 500, height - 102)
    
    c.setFont("Helvetica", 10)
    skills = [
        "- Programming: Python, JavaScript, Java, C++, SQL",
        "- Frameworks: FastAPI, React, Node.js, Flask",
        "- Tools: Git, Docker, Kubernetes, AWS",
        "- AI/ML: PyTorch, TensorFlow, Machine Learning, Data Science"
    ]
    y_pos = height - 120
    for skill in skills:
        c.drawString(120, y_pos, skill)
        y_pos -= 15
        
    # Experience
    c.setFont("Helvetica-Bold", 12)
    y_pos -= 20
    c.drawString(100, y_pos, "Experience")
    c.line(100, y_pos - 2, 500, y_pos - 2)
    
    y_pos -= 20
    c.setFont("Helvetica-Bold", 10)
    c.drawString(100, y_pos, "Software Developer Intern | Tech Company")
    c.setFont("Helvetica-Oblique", 9)
    c.drawString(400, y_pos, "June 2023 - Present")
    
    y_pos -= 15
    c.setFont("Helvetica", 10)
    c.drawString(120, y_pos, "- Developed REST APIs using FastAPI and Python.")
    y_pos -= 15
    c.drawString(120, y_pos, "- Built frontend components with React and Tailwind CSS.")
    y_pos -= 15
    c.drawString(120, y_pos, "- Collaborated with the data science team on machine learning models.")
    
    # Education
    y_pos -= 35
    c.setFont("Helvetica-Bold", 12)
    c.drawString(100, y_pos, "Education")
    c.line(100, y_pos - 2, 500, y_pos - 2)
    
    y_pos -= 20
    c.setFont("Helvetica-Bold", 10)
    c.drawString(100, y_pos, "Bachelor of Science in Computer Science")
    c.setFont("Helvetica", 10)
    c.drawString(100, y_pos - 15, "University of Technology | 2020 - 2024")

    c.save()
    print(f"Created {filename}")

if __name__ == "__main__":
    create_sample_resume()
