from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class MMSEResponse(BaseModel):
    question_id: int
    score: float # 0 or 1
    response_text: str
    metadata: Optional[Dict[str, Any]] = None

class MMSEVerbalRequest(BaseModel):
    question_id: int
    audio_content: Optional[str] = None # Base64 encoded or path
    text_content: Optional[str] = None # Direct text if Whisper is client-side

class MMSEOCRRequest(BaseModel):
    image_content: str # Base64 encoded image

class MMSEBulkOCRRequest(BaseModel):
    file_content: str # Base64 encoded PDF or Image
    mime_type: Optional[str] = "image/png"

class MMSEOutcome(BaseModel):
    total_score: float
    risk_level: str
    mode: str
    details: List[MMSEResponse]

class MMSESubmitRequest(BaseModel):
    user_id: str
    total_score: float
    risk_level: str
    mode: str
    responses: List[MMSEResponse]
