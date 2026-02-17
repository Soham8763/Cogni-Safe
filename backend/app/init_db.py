"""
Initialize the database tables.
Run this script once to create the database schema.
"""
from backend.app.database import engine, Base
from backend.app.models.db_models import SpeechTestResult, SentenceRecording, CognitiveGameSession, GameAttempt, EEGTestResult
from backend.app.models.doctor_models import Doctor, Appointment, Invoice
from sqlalchemy.orm import Session
from datetime import datetime

def seed_doctors(db: Session):
    """Seed the database with sample doctors for the 'Explore' section"""
    sample_doctors = [
        {
            "name": "Dr. Sarah Mitchell",
            "specialty": "Neurologist",
            "experience_years": 15,
            "rating": 4.9,
            "consultation_fee": 150.0,
            "email": "sarah.mitchell@hospital.com",
            "bio": "Specializing in early-onset Alzheimer's and cognitive disorders with 15+ years of clinical research."
        },
        {
            "name": "Dr. James Wilson",
            "specialty": "Speech & Language Therapist",
            "experience_years": 10,
            "rating": 4.7,
            "consultation_fee": 100.0,
            "email": "j.wilson@care.org",
            "bio": "Expert in geriatric language pathology and cognitive-linguistic intervention."
        },
        {
            "name": "Dr. Priayanka Sharma",
            "specialty": "Geriatric Psychiatrist",
            "experience_years": 12,
            "rating": 4.8,
            "consultation_fee": 130.0,
            "email": "p.sharma@clinic.in",
            "bio": "Dedicated to improving behavioral symptoms and quality of life for dementia patients."
        }
    ]

    for doc_data in sample_doctors:
        # Check if doctor already exists
        exists = db.query(Doctor).filter(Doctor.email == doc_data["email"]).first()
        if not exists:
            db_doc = Doctor(**doc_data)
            db.add(db_doc)

    db.commit()
    print("✅ Sample doctors seeded successfully!")

def init_db():
    """Create all tables in the database"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")
    print(f"Database location: cogni_safe.db")

    # Seed doctors
    from backend.app.database import SessionLocal
    db = SessionLocal()
    try:
        seed_doctors(db)
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
