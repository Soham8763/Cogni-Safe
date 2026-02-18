import json
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime

from backend.app.database import get_db
from backend.app.models.db_models import MMSEAssessmentResult
from backend.app.models.mmse_schemas import (
    MMSEResponse,
    MMSEVerbalRequest,
    MMSEOCRRequest,
    MMSEBulkOCRRequest,
    MMSEOutcome,
    MMSESubmitRequest
)

import shutil
import tempfile
from Levenshtein import ratio
from backend.app.services.speech.whisper_service import transcribe_with_timestamps
from backend.app.services.speech.feature_extractor import extract_acoustic_features, extract_linguistic_features
from backend.app.services.speech.pause_analyzer import detect_pauses_from_audio

router = APIRouter(
    prefix="/api/mmse",
    tags=["mmse-assessment"]
)

# Load question bank
BANK_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "mmse_bank.json")

def load_bank():
    with open(BANK_PATH, "r") as f:
        return json.load(f)

@router.get("/questions")
async def get_mmse_questions():
    """Return all 53 standardized questions"""
    try:
        return load_bank()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def generate_fluency_timeline(words: List[Any]) -> List[Dict[str, Any]]:
    """
    Generate a time-series timeline of speech activity from Whisper word timestamps.
    Detects pauses and potential stuttering (repetitions).
    """
    if not words:
        return []

    timeline = []
    # Initial state
    timeline.append({"time": 0.0, "activity": 0, "type": "silence"})

    def get_val(obj, key, default=0):
        try:
            return getattr(obj, key)
        except AttributeError:
            try:
                return obj.get(key, default)
            except (AttributeError, TypeError):
                return default

    for i, word_info in enumerate(words):
        start = round(float(get_val(word_info, "start")), 2)
        end = round(float(get_val(word_info, "end")), 2)
        word = str(get_val(word_info, "word", "")).strip().lower()

        # Add silence before word if gap exists
        if i > 0:
            prev_end = round(float(get_val(words[i-1], "end")), 2)
            if start > prev_end + 0.1:
                timeline.append({"time": prev_end + 0.01, "activity": 0, "type": "silence"})
                timeline.append({"time": start - 0.01, "activity": 0, "type": "silence"})

        # Detect stuttering (repetition)
        is_stutter = False
        if i > 0:
            prev_word = str(get_val(words[i-1], "word", "")).strip().lower()
            prev_end_val = float(get_val(words[i-1], "end"))
            if prev_word == word and (start - prev_end_val) < 0.5:
                is_stutter = True

        # Add speech segment
        # Use simple 0/1 for Recharts AreaChart
        timeline.append({"time": start, "activity": 1, "type": "stutter" if is_stutter else "speech", "word": word})
        timeline.append({"time": end, "activity": 1, "type": "stutter" if is_stutter else "speech", "word": word})

    # Final silence point
    if words:
        last_end = float(get_val(words[-1], "end"))
        timeline.append({"time": last_end + 0.1, "activity": 0, "type": "silence"})

    return timeline

@router.post("/evaluate/verbal", response_model=MMSEResponse)
async def evaluate_verbal(
    question_id: int = Form(...),
    file: UploadFile = File(...)
):
    """
    Evaluate a verbal response using Clinical-Grade AI Analysis.
    Integrates Whisper Transcription, Audio-based Pause Analysis, and Acoustic Features.
    """
    print(f"\n{'='*70}")
    print(f"🎙️ CLINICAL MMSE VERBAL EVALUATION STARTING...")
    print(f"   Question ID: {question_id}")
    print(f"   Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*70}")

    bank = load_bank()
    question = next((q for q in bank if q["id"] == question_id), None)

    if not question:
        print(f"❌ ERROR: Question {question_id} not found in bank.")
        raise HTTPException(status_code=404, detail="Question find failed")

    print(f"📋 Question Text: {question['text']}")

    # 1. Save temp audio file
    print("💾 Saving temporary audio buffer...")
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        # Pre-load audio for shared usage
        print("🎵 Pre-loading audio for clinical analysis...")
        import librosa
        y, sr = librosa.load(tmp_path, sr=None)
        y_sr = (y, sr)

        # 2. Clinical Transcription (Whisper)
        print("🧠 Invoking Whisper AI for transcription...")
        transcription_result = transcribe_with_timestamps(tmp_path)
        response_text = transcription_result["text"]
        words = transcription_result.get("words", [])
        print(f"✅ Transcription: \"{response_text}\"")

        # 3. Audio-Based Pause Analysis
        print("⏸️  Analyzing pause patterns and fluency...")
        pause_analysis = detect_pauses_from_audio(tmp_path, min_silence_duration=0.3, y_sr=y_sr)
        print(f"✅ Fluency: {pause_analysis['pause_count']} pauses, Avg {pause_analysis['avg_pause_duration']:.2f}s")

        # 4. Acoustic Feature Extraction
        print("📊 Extracting acoustic biomarkers (pitch, energy)...")
        acoustic_features = extract_acoustic_features(tmp_path, y_sr=y_sr)
        print(f"✅ Acoustic Data: Pitch Mean {acoustic_features.get('pitch_mean', 0):.2f}Hz")

        # 5. Fluency Timeline Generation
        print("📈 Generating clinical fluency timeline...")
        fluency_timeline = generate_fluency_timeline(words)
        stutter_count = sum(1 for p in fluency_timeline if p.get("type") == "stutter") // 2

        # 5. Semantic Accuracy Scoring
        print("🎯 Calculating semantic accuracy and scoring...")
        expected = question.get("expected")
        score = 0.0
        ref_text = ""
        semantic_acc = 0.0

        if expected:
            # Handle special dynamic triggers
            if expected == "DYNAMIC_DATE":
                # Basic validation for date-like responses
                if any(word in response_text.lower() for word in ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "202", "januar", "februar", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]):
                    score = 1.0
                    semantic_acc = 1.0
                    print("✅ Dynamic Date Match: Valid temporal response.")
            elif expected == "DYNAMIC_DAY":
                if any(word in response_text.lower() for word in ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]):
                    score = 1.0
                    semantic_acc = 1.0
                    print("✅ Dynamic Day Match: Valid weekday response.")
            elif expected == "DYNAMIC_LOCATION":
                if len(response_text) > 2: # City names are usually > 2 chars
                    score = 1.0
                    semantic_acc = 1.0
                    print("✅ Dynamic Location Match: Valid place response.")

            # Standard matching logic
            if score < 1.0:
                if isinstance(expected, list):
                    ref_text = " ".join(expected).lower()
                    if all(item.lower() in response_text.lower() for item in expected):
                        score = 1.0
                        print("✅ Keyword Match: Standard satisfied.")
                elif isinstance(expected, str):
                    ref_text = expected.lower()
                    if expected.lower() in response_text.lower():
                        score = 1.0
                        print("✅ Keyword Match: Standard satisfied.")

                if ref_text:
                    semantic_acc = ratio(ref_text, response_text.lower())
                    print(f"ℹ️ Semantic Similarity Ratio: {semantic_acc:.2f}")
                    if score < 0.5 and semantic_acc > 0.7:
                        score = 1.0
                        print("✅ Semantic Logic: Marked as correct due to high similarity.")
        else:
            if len(response_text) > 3:
                score = 1.0
                semantic_acc = 1.0
                print("✅ Open-ended: Captured valid response.")

        print(f"🏁 Final Score for Question {question_id}: {score}")
        print(f"{'='*70}\n")

        return MMSEResponse(
            question_id=question_id,
            score=score,
            response_text=response_text,
            metadata={
                "grading_method": "clinical_verbal_ai",
                "accuracy_metrics": {
                    "semantic_ratio": round(semantic_acc, 2)
                },
                "fluency_metrics": {
                    "pause_count": pause_analysis["pause_count"],
                    "avg_pause_duration": round(pause_analysis["avg_pause_duration"], 2),
                    "long_pause_count": pause_analysis["long_pause_count"],
                    "stutter_count": stutter_count,
                    "timeline": fluency_timeline
                },
                "acoustic_features": acoustic_features
            }
        )

    except Exception as e:
        import traceback
        error_detail = f"❌ Clinical Evaluation Failure: {str(e)}\n{traceback.format_exc()}"
        print(error_detail)
        raise HTTPException(status_code=500, detail=error_detail)

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@router.post("/evaluate/ocr", response_model=List[MMSEResponse])
async def evaluate_ocr(request: MMSEOCRRequest):
    """
    Evaluate a photo of a paper test
    Mocked for hackathon: simulates OCR extraction
    """
    # Simulate processing delay
    import asyncio
    await asyncio.sleep(1)

     # Return mock results for a few questions to show functional UI
    return [
        MMSEResponse(question_id=1, score=1, response_text="Extracted: 2026-02-14"),
        MMSEResponse(question_id=14, score=1, response_text="Shape match: 95%"),
        MMSEResponse(question_id=28, score=1, response_text="Sentence found: The cat is on the mat.")
    ]

@router.post("/evaluate/bulk_ocr", response_model=List[MMSEResponse])
async def evaluate_bulk_ocr(request: MMSEBulkOCRRequest):
    """
    Extract answers from a full MMSE page or PDF at once.
    This simulates an advanced OCR + LLM parsing logic.
    """
    bank = load_bank()
    results = []

    # Simulate processing time
    import asyncio
    await asyncio.sleep(2)

    # Simulated extraction logic:
    # We "find" most questions and assign scores based on a mock high-performance test
    import random

    for q in bank:
        # High probability of success for demo, but some misses to show realism
        success = random.random() > 0.1
        score = 1.0 if success else 0.0

        results.append(MMSEResponse(
            question_id=q["id"],
            score=score,
            response_text=f"Autofilled via Bulk OCR: {q['text'][:20]}...",
            metadata={"source": "bulk_ocr_parser"}
        ))

    return results

@router.post("/submit")
async def submit_mmse(request: MMSESubmitRequest, db: Session = Depends(get_db)):
    """Persist MMSE results to database"""
    try:
        # Map total score to risk level
        # 53 total questions
        # Normal: 45-53
        # Mild: 35-44
        # Moderate: 20-34
        # Severe: 0-19

        score = request.total_score
        if score >= 45:
            risk = "Normal"
        elif score >= 35:
            risk = "Mild"
        elif score >= 20:
            risk = "Moderate"
        else:
            risk = "Severe"

        result = MMSEAssessmentResult(
            user_id=request.user_id,
            total_score=score,
            risk_level=risk,
            mode=request.mode,
            responses=[res.dict() for res in request.responses],
            completed=True
        )

        db.add(result)
        db.commit()
        db.refresh(result)

        return {"success": True, "id": result.id, "calculated_risk": risk}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
