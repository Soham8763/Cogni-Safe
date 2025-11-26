export interface SpeechTestSession {
    session_id: string;
    stimulus_sentences: string[];
    initial_volume: number;
}

export interface PauseLocation {
    after_word: string;
    duration: number;
}

export interface SpeechFeatures {
    acoustic_features: Record<string, any>;
    linguistic_features: Record<string, any>;
}

export interface SpeechAnalysisResult {
    reaction_time_ms: number;
    transcription: string;
    word_accuracy: number;
    speech_rate_wpm: number;
    avg_pause_duration: number;
    long_pause_count: number;
    pause_locations: PauseLocation[];
    risk_score: number;
    risk_level: string;
    features: SpeechFeatures;
}

export interface AudiometryResult {
    threshold_db: number;
    continue_test: boolean;
    next_volume: number | null;
}

export interface SpeechRiskScore {
    overall_risk_score: number;
    reaction_time_score: number;
    speech_quality_score: number;
    hearing_score: number;
    recommendations: string[];
}
