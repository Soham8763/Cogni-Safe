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
