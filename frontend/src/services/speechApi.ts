import type { SpeechTestSession, SpeechAnalysisResult, AudiometryResult, SpeechRiskScore } from '../types/speech';

const API_BASE_URL = 'http://localhost:8000/api/speech';

export const startSpeechTest = async (userId: string): Promise<SpeechTestSession> => {
    const response = await fetch(`${API_BASE_URL}/start-test`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, test_type: 'full' }),
    });
    if (!response.ok) throw new Error('Failed to start test');
    return response.json();
};

export const analyzeSpeech = async (
    sessionId: string,
    stimulusSentence: string,
    audioBlob: Blob,
    audioEndTimestamp: number,
    speechStartTimestamp: number
): Promise<SpeechAnalysisResult> => {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('stimulus_sentence', stimulusSentence);
    formData.append('audio_end_timestamp', audioEndTimestamp.toString());
    formData.append('speech_start_timestamp', speechStartTimestamp.toString());
    formData.append('file', audioBlob, 'recording.wav');

    const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        body: formData,
    });
    if (!response.ok) throw new Error('Failed to analyze speech');
    return response.json();
};

export const performAudiometryTest = async (
    frequency: number,
    volume: number,
    heard: boolean
): Promise<AudiometryResult> => {
    const response = await fetch(`${API_BASE_URL}/audiometry`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            frequency_hz: frequency,
            volume_level: volume,
            user_heard: heard,
        }),
    });
    if (!response.ok) throw new Error('Audiometry test failed');
    return response.json();
};

export const getSpeechResults = async (sessionId: string): Promise<SpeechRiskScore> => {
    const response = await fetch(`${API_BASE_URL}/results/${sessionId}`);
    if (!response.ok) throw new Error('Failed to get results');
    return response.json();
};
