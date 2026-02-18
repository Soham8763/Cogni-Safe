export interface PredictionResponse {
    status_class: number;
    probability: number;
    risk_level: string;
    model_version: string;
}

export interface EEGSampleRequest {
    eeg: number[][];
    sampling_rate?: number;
}

export interface Doctor {
    id: number;
    name: string;
    specialty: string;
    experience_years: number;
    rating: number;
    consultation_fee: number;
    bio: string;
    email: string;
}

export interface BookingRequest {
    user_id: string;
    doctor_id: number;
    appointment_time: string;
}

export interface AppointmentResponse {
    id: number;
    user_id: string;
    doctor_id: number;
    appointment_time: string;
    status: string;
    payment_status: string;
}

const API_URL = "http://localhost:8000";

export const postPredictEEG = async (payload: EEGSampleRequest): Promise<PredictionResponse> => {
    const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to predict");
    }

    return response.json();
};

export const getDoctors = async (): Promise<Doctor[]> => {
    const response = await fetch(`${API_URL}/api/doctors/`);
    if (!response.ok) throw new Error("Failed to fetch doctors");
    return response.json();
};

export const getDoctorRecommendations = async (assessment: any): Promise<Doctor[]> => {
    const response = await fetch(`${API_URL}/api/doctors/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assessment),
    });
    if (!response.ok) throw new Error("Failed to fetch recommendations");
    return response.json();
};

export const bookAppointment = async (payload: BookingRequest): Promise<AppointmentResponse> => {
    const response = await fetch(`${API_URL}/api/doctors/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Failed to book appointment");
    return response.json();
};

export const getInvoice = async (appointmentId: number): Promise<any> => {
    const response = await fetch(`${API_URL}/api/doctors/invoice/${appointmentId}`);
    if (!response.ok) throw new Error("Failed to fetch invoice");
    return response.json();
};

export interface MMSEQuestion {
    id: number;
    text: string;
    type: string;
    level: string;
    score: number;
    expected?: any;
}

export interface MMSEResponse {
    question_id: number;
    score: number;
    response_text: string;
    metadata?: any;
}

export const getMMSEQuestions = async (): Promise<MMSEQuestion[]> => {
    const response = await fetch(`${API_URL}/api/mmse/questions`);
    if (!response.ok) throw new Error("Failed to fetch MMSE questions");
    return response.json();
};

export const evaluateMMSEVerbal = async (questionId: number, audioBlob: Blob): Promise<MMSEResponse> => {
    const formData = new FormData();
    formData.append("question_id", questionId.toString());
    formData.append("file", audioBlob, "mmse_response.wav");

    const response = await fetch(`${API_URL}/api/mmse/evaluate/verbal`, {
        method: "POST",
        body: formData,
    });
    if (!response.ok) throw new Error("Verbal evaluation failed");
    return response.json();
};

export const evaluateMMSEOCR = async (imageB64: string): Promise<MMSEResponse[]> => {
    const response = await fetch(`${API_URL}/api/mmse/evaluate/ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_content: imageB64 }),
    });
    if (!response.ok) throw new Error("OCR evaluation failed");
    return response.json();
};

export const evaluateMMSEBulkOCR = async (fileB64: string, mimeType: string): Promise<MMSEResponse[]> => {
    const response = await fetch(`${API_URL}/api/mmse/evaluate/bulk_ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_content: fileB64, mime_type: mimeType }),
    });
    if (!response.ok) throw new Error("Bulk OCR evaluation failed");
    return response.json();
};

export const submitMMSE = async (payload: {
    user_id: string;
    total_score: number;
    risk_level: string;
    mode: string;
    responses: MMSEResponse[];
}): Promise<any> => {
    const response = await fetch(`${API_URL}/api/mmse/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Submission failed");
    return response.json();
};
