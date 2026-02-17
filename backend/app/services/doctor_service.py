from sqlalchemy.orm import Session
from backend.app.models.doctor_models import Doctor, Appointment, Invoice
from backend.app.models.unified_schemas import UnifiedAnalysisResponse
from datetime import datetime
from typing import List, Optional
import uuid

class DoctorService:
    @staticmethod
    def get_all_doctors(db: Session) -> List[Doctor]:
        return db.query(Doctor).all()

    @staticmethod
    def recommend_doctors(db: Session, assessment: UnifiedAnalysisResponse) -> List[Doctor]:
        """
        AI Logic: Identify the lowest scoring cognitive domain and recommend matching specialists.
        """
        domains = assessment.cognitive_domains
        scores = {
            "Neurologist": min(domains.memory, domains.executive_function),
            "Speech & Language Therapist": domains.language,
            "Geriatric Psychiatrist": min(domains.attention, domains.processing_speed)
        }

        # Sort specialties by lowest score (highest need)
        recommended_specialty = min(scores, key=scores.get)

        # Return doctors with that specialty first, then fill with others
        priority_docs = db.query(Doctor).filter(Doctor.specialty == recommended_specialty).all()
        other_docs = db.query(Doctor).filter(Doctor.specialty != recommended_specialty).limit(3 - len(priority_docs)).all()

        return priority_docs + other_docs

    @staticmethod
    def create_appointment(db: Session, user_id: str, doctor_id: int, slot: datetime) -> Appointment:
        appointment = Appointment(
            user_id=user_id,
            doctor_id=doctor_id,
            appointment_time=slot,
            status="booked",
            payment_status="paid"  # Mocked as completed for hackathon
        )
        db.add(appointment)
        db.commit()
        db.refresh(appointment)

        # Generate associated invoice
        invoice = Invoice(
            appointment_id=appointment.id,
            invoice_number=f"INV-{uuid.uuid4().hex[:8].upper()}",
            amount=db.query(Doctor).get(doctor_id).consultation_fee,
            user_details={"user_id": user_id}
        )
        db.add(invoice)
        db.commit()

        return appointment

    @staticmethod
    def send_report_to_doctor(appointment: Appointment, assessment: UnifiedAnalysisResponse):
        """
        Mock Agentic AI action: sending report to doctor's inbox via email.
        """
        doctor = appointment.doctor
        print(f"📧 [AGENT] Sending report for user {assessment.user_id} to {doctor.name} ({doctor.email})...")
        # In a real app, this would trigger an SMTP call or Mailgun API
        return True
