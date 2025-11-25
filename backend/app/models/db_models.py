from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.app.database import Base

class SpeechTestResult(Base):
    """Main table for speech test results"""
    __tablename__ = "speech_test_results"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(255), unique=True, nullable=False, index=True)
    user_id = Column(String(255), index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Test metadata
    test_type = Column(String(50), default="full")
    completed = Column(Boolean, default=False)
    user_consented = Column(Boolean, default=False)  # Privacy consent

    # Audiometry
    hearing_threshold_db = Column(Integer)

    # Overall scores
    overall_risk_score = Column(Float)
    risk_level = Column(String(20))

    # Component scores
    reaction_time_score = Column(Float)
    speech_quality_score = Column(Float)
    accuracy_score = Column(Float)
    pause_score = Column(Float)

    # Aggregated metrics
    avg_reaction_time_ms = Column(Float)
    avg_speech_rate_wpm = Column(Float)
    avg_pause_duration = Column(Float)
    avg_word_accuracy = Column(Float)

    # Raw data (JSON)
    sentence_results = Column(JSON)  # List of all sentence results
    acoustic_features = Column(JSON)  # Aggregated acoustic features
    linguistic_features = Column(JSON)  # Aggregated linguistic features

    # Labels for ML (optional, added later by clinician)
    ground_truth_label = Column(String(50))  # e.g., "healthy", "mci", "alzheimers"
    verified_by = Column(String(255))
    verified_at = Column(DateTime(timezone=True))

    # Relationship
    recordings = relationship("SentenceRecording", back_populates="test_result", cascade="all, delete-orphan")


class SentenceRecording(Base):
    """Individual sentence recordings and analysis"""
    __tablename__ = "sentence_recordings"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(255), ForeignKey("speech_test_results.session_id"), nullable=False)
    sentence_index = Column(Integer, nullable=False)
    stimulus_sentence = Column(Text, nullable=False)

    # Recording metadata
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
    duration_seconds = Column(Float)

    # Analysis results
    transcription = Column(Text)
    word_accuracy = Column(Float)
    reaction_time_ms = Column(Float)
    speech_rate_wpm = Column(Float)
    avg_pause_duration = Column(Float)
    long_pause_count = Column(Integer)

    # Features
    acoustic_features = Column(JSON)
    linguistic_features = Column(JSON)
    pause_locations = Column(JSON)

    # Risk assessment
    risk_score = Column(Float)
    risk_level = Column(String(20))

    # Audio file path (optional - not storing audio by default for privacy)
    audio_file_path = Column(String(500))

    # Relationship
    test_result = relationship("SpeechTestResult", back_populates="recordings")
