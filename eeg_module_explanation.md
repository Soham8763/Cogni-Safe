# 🧠 EEG Analysis Module: Technical Deep Dive

## 1. Overview
The EEG Analysis Module is designed to detect early signs of cognitive decline (MCI/Alzheimer's) by analyzing the "spectral slowing" of brainwave activity. It processes raw EEG signals, extracts frequency-domain biomarkers, and uses a Machine Learning model to predict a risk score.

## 2. Workflow Architecture

1.  **Input**: The system accepts EEG data in `.edf` (European Data Format) or `.csv` format.
2.  **Preprocessing**:
    *   **Resampling**: All data is resampled to **256 Hz** to ensure consistency.
    *   **Windowing**: The continuous signal is sliced into **4-second windows** with a 2-second overlap (50%).
    *   **Filtering**: A bandpass filter (0.5 - 50 Hz) is applied to remove DC drift (low freq noise) and power line interference (high freq noise).
3.  **Feature Extraction**: For each window and each channel, we calculate specific biomarkers (detailed below).
4.  **Inference**: A pre-trained **Random Forest Classifier** analyzes the feature vector and outputs a probability (0.0 to 1.0).
5.  **Aggregation**: The probabilities from all windows are averaged to produce the final session risk score.

---

## 3. Feature Extraction (What we calculate)

We extract features primarily from the **Frequency Domain** using **Power Spectral Density (PSD)** via Welch's Method.

### 📊 Frequency Bands & Significance

| Band | Frequency Range | Cognitive Significance | In Alzheimer's/MCI |
| :--- | :--- | :--- | :--- |
| **Delta** | 0.5 - 4 Hz | Deep sleep, unconsciousness. | **INCREASES** (Pathological slowing) |
| **Theta** | 4 - 8 Hz | Drowsiness, meditation, idling. | **INCREASES** (Key marker of decline) |
| **Alpha** | 8 - 13 Hz | Relaxed wakefulness, closing eyes. | **DECREASES** (Loss of "idle" rhythm) |
| **Beta** | 13 - 30 Hz | Active thinking, focus, alert. | **DECREASES** (Reduced cognitive processing) |
| **Gamma** | 30 - 45 Hz | High-level information processing. | **DECREASES** (Disrupted connectivity) |

### 🧮 Key Calculated Features

1.  **Absolute Band Power**: The total energy in each frequency band (uV²/Hz).
2.  **Relative Band Power (RBP)**: The percentage of total brain activity that falls into a specific band.
    *   *Formula*: `Power(Band) / Total_Power(0.5-45Hz)`
    *   *Why?* Absolute power varies by person/skull thickness. Relative power is normalized and comparable across patients.
3.  **Clinical Ratios**:
    *   **Theta/Beta Ratio (TBR)**: `Theta / Beta`. High TBR indicates slow-wave dominance (attention deficit/decline).
    *   **Delta/Alpha Ratio (DAR)**: `Delta / Alpha`. High DAR is strongly correlated with ischemic stroke and vascular dementia.
4. Time-Domain Stats: Mean, Standard Deviation, Skewness, Kurtosis (to detect artifacts/noise).

### 💡 Simplified Analogies (For Judges/Non-Techies)

#### 1. Segmentation = "The Spotify Playlist"
Imagine listening to a 1-hour playlist of music.
*   **Without Segmentation**: You'd just say "The music was generally loud." You miss the details.
*   **With Segmentation**: We chop the hour into **4-second clips**.
    *   *Clip 1*: Fast, chaotic (Heavy Metal) → **Awake/Anxious**
    *   *Clip 2*: Slow, calm (Lullaby) → **Drowsy/Dementia**
    *   *Clip 3*: Upbeat (Pop) → **Normal**
*   **Why?**: Dementia signs are often fleeting. By chopping the signal, we catch those specific brief moments where the brain "drifts off" (the Lullaby moments) that would otherwise get lost in the average.

#### 2. PSD (Power Spectral Density) = "The Audio Equalizer"
*   **Raw EEG (Time Domain)**: This is like looking at the *grooves on a vinyl record*. It's just a squiggly line. You can't look at the squiggle and say "That's a guitar" or "That's a drum."
*   **PSD (Frequency Domain)**: This is like the **Equalizer bars** on a stereo system.
    *   It separates the **Bass** (Low sounds) from the **Treble** (High sounds).
    *   **Delta/Theta Waves** = **The Bass** (Boomy, slow, deep).
    *   **Alpha/Beta Waves** = **The Treble** (Sharp, fast, high-pitched).
*   **The Insight**: A healthy awake brain is "Treble-heavy" (Alpha/Beta). A brain with dementia becomes "Bass-heavy" (Delta/Theta). PSD simply measures "How much Bass vs. Treble is in this 4-second clip?"

---

## 4. The "Spectral Slowing" Phenomenon

The core biological principle our model relies on is **Spectral Slowing**.

*   **Healthy Brain**: Dominant activity in **Alpha (8-13Hz)** and **Beta (13-30Hz)** during wakefulness. Fast, efficient processing.
*   **Cognitive Decline**: The brain "slows down." Power shifts **leftward** on the spectrum.
    *   Alpha/Beta power drops 📉
    *   Delta/Theta power rises 📈

**The Model's Job**: To detect this specific "shift left" pattern in the high-dimensional feature space.

---

## 5. Model & Training

*   **Algorithm**: **Random Forest Classifier** (Ensemble of Decision Trees).
*   **Why Random Forest?**
    *   Handles non-linear relationships well (e.g., the complex interaction between Theta and Alpha).
    *   Robust to noise and outliers (common in EEG).
    *   Provides "feature importance" (tells us which bands mattered most).
*   **Training Data**: The model is trained on labeled datasets (e.g., ADNI, PhysioNet) containing EEG recordings from:
    *   Class 0: Healthy Controls (HC)
    *   Class 1: Mild Cognitive Impairment (MCI) / Alzheimer's Disease (AD)

### Prediction Logic
1.  The model receives a feature vector (e.g., `[Delta_Rel: 0.4, Theta_Rel: 0.3, Alpha_Rel: 0.1, ...]`).
2.  It traverses its decision trees. Example logic branch:
    *   *Is Theta > 0.25?* **YES**
    *   *Is Alpha < 0.15?* **YES**
    *   *Is TBR > 2.5?* **YES**
    *   -> **Vote: High Risk**
3.  The ensemble averages the votes to produce a probability (e.g., `0.85`).
4.  **Final Output**:
    *   **Probability**: `0.85` (85% confidence in impairment pattern)
    *   **Risk Level**: `High` (>70%)

---

## 6. Summary for Teammates

> "Our EEG module takes raw brain signals, chops them into 4-second pieces, and calculates how much energy is in the 'slow' waves (Delta/Theta) vs. the 'fast' waves (Alpha/Beta). It uses a Random Forest model to check if the brain is showing the specific 'slowing down' pattern characteristic of early dementia. If the model sees high Theta and low Alpha, it flags a high risk score."
