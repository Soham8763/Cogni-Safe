from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.app.database import get_db
from backend.app.services.doctor_service import DoctorService
from backend.app.models.doctor_models import Doctor as DoctorModel, Appointment as AppointmentModel, Invoice as InvoiceModel
from backend.app.models.unified_schemas import UnifiedAnalysisResponse
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])

class BookingRequest(BaseModel):
    user_id: str
    doctor_id: int
    appointment_time: datetime

class AppointmentResponse(BaseModel):
    id: int
    user_id: str
    doctor_id: int
    appointment_time: datetime
    status: str
    payment_status: str

@router.get("/", response_model=List[dict])
def get_doctors(db: Session = Depends(get_db)):
    doctors = DoctorService.get_all_doctors(db)
    return [
        {
            "id": d.id,
            "name": d.name,
            "specialty": d.specialty,
            "experience_years": d.experience_years,
            "rating": d.rating,
            "consultation_fee": d.consultation_fee,
            "bio": d.bio,
            "email": d.email
        } for d in doctors
    ]

@router.post("/recommend", response_model=List[dict])
def recommend_doctors(assessment: UnifiedAnalysisResponse, db: Session = Depends(get_db)):
    doctors = DoctorService.recommend_doctors(db, assessment)
    return [
        {
            "id": d.id,
            "name": d.name,
            "specialty": d.specialty,
            "experience_years": d.experience_years,
            "rating": d.rating,
            "consultation_fee": d.consultation_fee,
            "bio": d.bio
        } for d in doctors
    ]

@router.post("/book", response_model=AppointmentResponse)
def book_appointment(request: BookingRequest, db: Session = Depends(get_db)):
    try:
        appointment = DoctorService.create_appointment(
            db, request.user_id, request.doctor_id, request.appointment_time
        )
        return appointment
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/invoice/{appointment_id}")
def get_invoice(appointment_id: int, db: Session = Depends(get_db)):
    invoice = db.query(InvoiceModel).filter(InvoiceModel.appointment_id == appointment_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    appointment = db.query(AppointmentModel).get(appointment_id)
    doctor = db.query(DoctorModel).get(appointment.doctor_id)

    return {
        "invoice_number": invoice.invoice_number,
        "amount": invoice.amount,
        "date": invoice.issued_at,
        "doctor_name": doctor.name,
        "specialty": doctor.specialty,
        "user_id": appointment.user_id,
        "payment_status": appointment.payment_status
    }
