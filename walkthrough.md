# CogniSafe EEG Dementia Screener Walkthrough

This document outlines the steps to run and verify the CogniSafe EEG Dementia Screener.

## 1. Prerequisites
Ensure you have `python` (3.8+) and `node` (16+) installed.

## 2. Setup and Training
First, install dependencies and train the model.

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run the notebooks in order to train the model
# You can use Jupyter or run them as scripts if converted, but for now, open them in VS Code or Jupyter Lab.
# Key notebook: notebooks/03_model_training_and_evaluation.ipynb
```

*Note: The model `models/eeg_best_model.joblib` must exist for the backend to work.*

## 3. Start the Backend
Open a terminal in the project root:

```bash
uvicorn backend.app.main:app --reload
```

You should see: `Uvicorn running on http://127.0.0.1:8000`

## 4. Start the Frontend
Open a new terminal in `frontend/`:

```bash
cd frontend
npm install
npm run dev
```

Open the URL shown (usually `http://localhost:5173`).

## 5. Usage
1.  Click **Start Screening** on the Home Page.
2.  Upload a JSON file containing EEG data.
    - Format: `[[channel1_sample1, channel2_sample1, ...], ...]` or `{"eeg": [...]}`.
    - You can generate a test sample using `notebooks/04_export_model_and_build_fastapi.ipynb`.
3.  View the Risk Level and Probability.

## 6. Verification Checklist
- [x] Backend starts without errors.
- [x] Frontend loads and navigates to Test Page.
- [x] API accepts valid JSON and returns prediction.
