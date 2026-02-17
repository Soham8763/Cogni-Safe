import json
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
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

@router.post("/evaluate/verbal", response_model=MMSEResponse)
async def evaluate_verbal(request: MMSEVerbalRequest):
    """
    Evaluate a verbal response using AI (Semantic Similarity)
    Mocked for hackathon: checks if keywords from expected answer are in the response
    """
    bank = load_bank()
    question = next((q for q in bank if q["id"] == request.question_id), None)

    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    response_text = request.text_content or "No response captured"
    score = 0

    # Mock Semantic Matching Logic
    # In production, this would use a Sentence Transformer or LLM
    expected = question.get("expected")

    if expected:
        if isinstance(expected, list):
            # Check if all elements are in response
            if all(item.lower() in response_text.lower() for item in expected):
                score = 1
        elif isinstance(expected, str):
            if expected.lower() in response_text.lower():
                score = 1
    else:
        # Default behavior for non-literal questions: high acceptance for hackathon
        if len(response_text) > 3:
            score = 1

    return MMSEResponse(
        question_id=request.question_id,
        score=score,
        response_text=response_text,
        metadata={"grading_method": "ai_verbal_semantic"}
    )

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
