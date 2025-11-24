# CogniSafe EEG Dementia Screener

An end-to-end ML-powered EEG screening service to detect early dementia risk.

## Project Structure

- `backend/`: FastAPI backend service.
- `frontend/`: React frontend application.
- `notebooks/`: Jupyter notebooks for EDA, feature engineering, and model training.
- `models/`: Trained models and scalers.
- `EEG_data_set.csv`: Source dataset.

## Setup

1.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

2.  **Run Notebooks**:
    Navigate to `notebooks/` and run them in order to train the model.

3.  **Start Backend**:
    ```bash
    uvicorn backend.app.main:app --reload
    ```

4.  **Start Frontend**:
    Navigate to `frontend/` and run:
    ```bash
    npm install
    npm run dev
    ```
