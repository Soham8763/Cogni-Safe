from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import joblib
import numpy as np
import os
import asyncio
import json
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from .schemas import EEGSampleRequest, PredictionResponse
from .feature_extraction import extract_features_from_segment
from .data_processing import parse_edf, parse_csv
from backend.app.routers import speech_analysis, cognitive_games

# ... (existing code) ...



# ... (existing code) ...


# Global variables for model and scaler
model = None
scaler = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load model on startup
    global model, scaler
    model_path = os.path.join("models", "eeg_best_model.joblib")
    # scaler_path = os.path.join("models", "eeg_scaler.joblib") # If scaler is separate

    try:
        # Check if model exists (it might not if notebooks haven't run)
        if os.path.exists(model_path):
            model = joblib.load(model_path)
            print(f"Model loaded from {model_path}")
        else:
            print(f"Warning: Model not found at {model_path}. Inference will fail.")

    except Exception as e:
        print(f"Error loading model: {e}")

    yield
    # Clean up if needed

app = FastAPI(title="CogniSafe EEG Screener", lifespan=lifespan)

app.include_router(speech_analysis.router)
app.include_router(cognitive_games.router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/simulate")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        # Simulate a session
        # In a real app, we might receive a file ID to stream, or stream from a device
        # Here we generate dummy data on the fly to simulate a live feed

        fs = 256
        window_size = 4 * fs # 4 seconds
        n_channels = 16

        while True:
            # Generate dummy chunk (replace with real file reading logic if needed)
            # We generate slightly different noise to vary the probability
            noise_level = np.random.uniform(0.5, 2.0)
            chunk = np.random.randn(window_size, n_channels) * noise_level

            # Run inference on this chunk
            # We need to handle the potential errors gracefully inside the loop
            try:
                features = extract_features_from_segment(chunk, fs=fs)
                features_reshaped = features.reshape(1, -1)

                if model:
                    status_class = int(model.predict(features_reshaped)[0])
                    probability = float(model.predict_proba(features_reshaped)[0][1])

                    if probability < 0.3:
                        risk_level = "Low"
                    elif probability < 0.7:
                        risk_level = "Medium"
                    else:
                        risk_level = "High"

                    response = {
                        "timestamp": np.random.randint(0, 10000), # Mock timestamp
                        "status_class": status_class,
                        "probability": probability,
                        "risk_level": risk_level,
                        "raw_chunk": chunk.tolist() # Send raw data for visualization (careful with size)
                    }

                    await websocket.send_text(json.dumps(response))
                else:
                    await websocket.send_text(json.dumps({"error": "Model not loaded"}))

            except Exception as e:
                await websocket.send_text(json.dumps({"error": str(e)}))

            # Wait for 1 second before next chunk (simulating real-time)
            await asyncio.sleep(1)

    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await websocket.close()



@app.get("/health")
def health_check():
    return {"status": "healthy", "model_loaded": model is not None}

def run_inference(eeg_data: np.ndarray, fs: int):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Check shape
    if eeg_data.ndim != 2:
        raise HTTPException(status_code=400, detail="EEG data must be 2D array [samples, channels]")

    if eeg_data.shape[1] != 16:
        raise HTTPException(status_code=400, detail=f"EEG data must have 16 channels. Got {eeg_data.shape[1]}")

    # Extract features
    features = extract_features_from_segment(eeg_data, fs=fs)

    # Reshape for prediction (1, n_features)
    features_reshaped = features.reshape(1, -1)

    # Predict
    status_class = int(model.predict(features_reshaped)[0])
    probability = float(model.predict_proba(features_reshaped)[0][1])

    # Determine risk level
    if probability < 0.3:
        risk_level = "Low"
    elif probability < 0.7:
        risk_level = "Medium"
    else:
        risk_level = "High"

    return PredictionResponse(
        status_class=status_class,
        probability=probability,
        risk_level=risk_level,
        model_version="v1.0"
    )

@app.post("/predict", response_model=PredictionResponse)
def predict_eeg(request: EEGSampleRequest):
    try:
        eeg_data = np.array(request.eeg)
        return run_inference(eeg_data, request.sampling_rate)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict_file", response_model=PredictionResponse)
async def predict_file(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        filename = file.filename.lower()

        if filename.endswith(".edf"):
            eeg_data = parse_edf(contents)
            # EDFs usually have their own fs, but parse_edf resamples to 256
            fs = 256
        elif filename.endswith(".csv"):
            # Decode bytes to string for CSV
            eeg_data = parse_csv(contents.decode('utf-8'))
            fs = 256 # Assumption for CSVs unless specified otherwise
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Use .csv or .edf")

        return run_inference(eeg_data, fs)

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
