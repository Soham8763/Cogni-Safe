"""
ML-based speech scoring using trained Random Forest model.
Replaces rule-based scoring with machine learning predictions.
"""
import joblib
import numpy as np
from typing import Dict, Any
import os

# Load the trained model
MODEL_PATH = "models/speech_ml_model.joblib"

try:
    ml_model = joblib.load(MODEL_PATH)
    print(f"✅ Loaded ML model from {MODEL_PATH}")
except FileNotFoundError:
    print(f"⚠️ ML model not found at {MODEL_PATH}. Please train the model first.")
    ml_model = None

def calculate_ml_risk_score(
    reaction_time_ms: float,
    speech_rate_wpm: float,
    avg_pause_duration: float,
    word_accuracy: float,
    long_pause_count: int = 0
) -> Dict[str, Any]:
    """
    Calculate risk score using ML model predictions.

    Args:
        reaction_time_ms: Time to start speaking after stimulus (ms)
        speech_rate_wpm: Words per minute
        avg_pause_duration: Average pause duration (seconds)
        word_accuracy: Word accuracy percentage (0-100)
        long_pause_count: Number of long pauses (>0.8s)

    Returns:
        Dictionary with risk score, level, probability, and feature contributions
    """

    if ml_model is None:
        # Fallback to simple rule-based if model not loaded
        return fallback_scoring(reaction_time_ms, speech_rate_wpm,
                               avg_pause_duration, word_accuracy)

    # Prepare features in the same order as training
    features = np.array([[
        reaction_time_ms,
        speech_rate_wpm,
        avg_pause_duration,
        word_accuracy,
        long_pause_count
    ]])

    # Get prediction and probability
    prediction = ml_model.predict(features)[0]
    probability = ml_model.predict_proba(features)[0]

    # Risk probability (probability of cognitive decline)
    risk_probability = probability[1]

    # Convert to 0-100 scale
    risk_score = risk_probability * 100

    # Determine risk level
    if risk_score < 25:
        risk_level = "Low"
    elif risk_score < 60:
        risk_level = "Medium"
    else:
        risk_level = "High"

    # Get feature importances for this prediction
    feature_names = ['reaction_time_ms', 'speech_rate_wpm', 'avg_pause_duration',
                     'word_accuracy', 'long_pause_count']

    # Calculate individual feature contributions (simplified)
    # Using feature importances as proxy for contribution
    feature_importances = ml_model.feature_importances_

    # Normalize feature values for comparison
    feature_values_normalized = {
        'reaction_time': min(reaction_time_ms / 3000, 1.0),  # Normalize to 0-1
        'speech_rate': max(0, 1 - speech_rate_wpm / 150),     # Inverse (lower is worse)
        'pause_duration': min(avg_pause_duration / 1.5, 1.0),
        'accuracy': max(0, 1 - word_accuracy / 100),          # Inverse
        'long_pauses': min(long_pause_count / 10, 1.0)
    }

    # Component scores (0-100, higher = more risk)
    component_scores = {
        'reaction_time_score': feature_values_normalized['reaction_time'] * 100,
        'speech_rate_score': feature_values_normalized['speech_rate'] * 100,
        'pause_score': feature_values_normalized['pause_duration'] * 100,
        'accuracy_score': feature_values_normalized['accuracy'] * 100,
        'long_pause_score': feature_values_normalized['long_pauses'] * 100
    }

    return {
        "overall_risk": round(risk_score, 1),
        "risk_level": risk_level,
        "risk_probability": round(risk_probability, 3),
        "prediction": "Cognitive Decline" if prediction == 1 else "Healthy",
        "confidence": round(max(probability) * 100, 1),
        "component_scores": component_scores,
        "feature_importances": {
            name: round(imp, 3)
            for name, imp in zip(feature_names, feature_importances)
        },
        "model_type": "RandomForest",
        "features_used": {
            "reaction_time_ms": reaction_time_ms,
            "speech_rate_wpm": speech_rate_wpm,
            "avg_pause_duration": avg_pause_duration,
            "word_accuracy": word_accuracy,
            "long_pause_count": long_pause_count
        }
    }

def fallback_scoring(reaction_time_ms, speech_rate_wpm, avg_pause_duration, word_accuracy):
    """Simple fallback if ML model not available"""
    # Simple weighted average
    rt_score = min(reaction_time_ms / 30, 100)
    sr_score = max(0, 100 - speech_rate_wpm / 1.5)
    pause_score = min(avg_pause_duration * 100, 100)
    acc_score = max(0, 100 - word_accuracy)

    overall = (rt_score * 0.4 + sr_score * 0.15 + pause_score * 0.2 + acc_score * 0.25)

    return {
        "overall_risk": round(overall, 1),
        "risk_level": "Medium" if overall > 50 else "Low",
        "component_scores": {
            "reaction_time_score": rt_score,
            "speech_rate_score": sr_score,
            "pause_score": pause_score,
            "accuracy_score": acc_score
        },
        "model_type": "Fallback"
    }
