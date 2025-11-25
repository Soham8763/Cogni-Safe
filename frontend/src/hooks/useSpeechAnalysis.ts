import { useState } from 'react';
import { startSpeechTest, analyzeSpeech, getSpeechResults } from '../services/speechApi';
import type { SpeechTestSession, SpeechAnalysisResult, SpeechRiskScore } from '../types/speech';

export const useSpeechAnalysis = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const startTest = async (userId: string): Promise<SpeechTestSession | null> => {
        setIsLoading(true);
        setError(null);
        try {
            const session = await startSpeechTest(userId);
            return session;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const analyze = async (
        sessionId: string,
        stimulusSentence: string,
        audioBlob: Blob,
        audioEndTimestamp: number,
        speechStartTimestamp: number
    ): Promise<SpeechAnalysisResult | null> => {
        console.log("🌐 Calling API to analyze speech...");
        setIsLoading(true);
        setError(null);
        try {
            const result = await analyzeSpeech(
                sessionId,
                stimulusSentence,
                audioBlob,
                audioEndTimestamp,
                speechStartTimestamp
            );
            console.log("✅ API call successful:", result);
            return result;
        } catch (err: any) {
            console.error("❌ API call failed:", err);
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const fetchResults = async (sessionId: string): Promise<SpeechRiskScore | null> => {
        setIsLoading(true);
        setError(null);
        try {
            const results = await getSpeechResults(sessionId);
            return results;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        startTest,
        analyze,
        fetchResults,
        isLoading,
        error
    };
};
