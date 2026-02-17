from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.app.database import Base

class Doctor(Base):
    """Table for storage clinician details"""
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    specialty = Column(String(100), nullable=False, index=True)  # Neurologist, Psychiatrist, SALT, etc.
    experience_years = Column(Integer, default=0)
    rating = Column(Float, default=5.0)
    consultation_fee = Column(Float, nullable=False)
    bio = Column(Text)
    profile_image_url = Column(String(500))
    email = Column(String(255), nullable=False)  # For sending reports
    available_slots = Column(JSON)  # List of available timings

    # Relationships
    appointments = relationship("Appointment", back_populates="doctor")

class Appointment(Base):
    """Table for booking sessions with doctors"""
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), index=True, nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    appointment_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), default="booked")  # booked, completed, cancelled
    payment_status = Column(String(20), default="pending")  # pending, paid
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    doctor = relationship("Doctor", back_populates="appointments")
    invoice = relationship("Invoice", back_populates="appointment", uselist=False)

class Invoice(Base):
    """Table for billing records"""
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=False)
    invoice_number = Column(String(100), unique=True, nullable=False)
    amount = Column(Float, nullable=False)
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
    payment_method = Column(String(50), default="mock_payment")
    user_details = Column(JSON)  # Snapshot of user details for the invoice

    # Relationships
    appointment = relationship("Appointment", back_populates="invoice")
