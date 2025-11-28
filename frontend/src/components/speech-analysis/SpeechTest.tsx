import React, { useState } from 'react';
import { useSpeechAnalysis } from '../../hooks/useSpeechAnalysis';
import AudioPlayer from './AudioPlayer';
import AudioRecorder from './AudioRecorder';
import ReactionTimer from './ReactionTimer';
import AudiometryTest from './AudiometryTest';
import SpeechResults from './SpeechResults';
import type { SpeechAnalysisResult } from '../../types/speech';

interface SpeechTestProps {
    userId: string;
    onComplete?: () => void;
}

const SpeechTest: React.FC<SpeechTestProps> = ({ userId, onComplete }) => {
    const { startTest, analyze, isLoading, error } = useSpeechAnalysis();

    const [phase, setPhase] = useState<'intro' | 'audiometry' | 'recording' | 'results'>('intro');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sentences, setSentences] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentVolume, setCurrentVolume] = useState(0.5);

    // Recording State
    const [isListening, setIsListening] = useState(false);
    const [playbackEndedTime, setPlaybackEndedTime] = useState<number>(0);
    const [lastAnalysis, setLastAnalysis] = useState<SpeechAnalysisResult | null>(null);

    const handleStart = async () => {
        const session = await startTest(userId);
        if (session) {
            setSessionId(session.session_id);
            setSentences(session.stimulus_sentences);
            setCurrentVolume(session.initial_volume);
            setPhase('audiometry');
        }
    };

    const handleAudiometryComplete = (thresholdDb: number) => {
        // In a real app, we'd adjust volume based on threshold
        console.log("Hearing threshold:", thresholdDb);
        setPhase('recording');
    };

    const handlePlaybackEnd = () => {
        console.log("🎵 Playback ended, will start listening in 500ms");
        setPlaybackEndedTime(Date.now());
        // Small delay to ensure the AudioPlayer's onend callback completes
        setTimeout(() => {
            setIsListening(true);
        }, 500);
    };


    const handleRecordingComplete = async (blob: Blob, _duration: number) => {
        console.log("📝 Recording complete, analyzing...");
        setIsListening(false);
        if (!sessionId) {
            console.error("❌ No session ID!");
            return;
        }

        // Estimate speech start (simplified)
        const speechStartTime = playbackEndedTime + 500;

        console.log(`🔍 Analyzing sentence ${currentIndex + 1}/${sentences.length}`);
        const result = await analyze(
            sessionId,
            sentences[currentIndex],
            blob,
            Date.now(),
            speechStartTime
        );

        console.log("📊 Analysis result:", result);

        if (result) {
            setLastAnalysis(result);
            console.log(`✅ Analysis complete! Moving to next sentence in 3s...`);
            // Wait a moment to show feedback before next sentence
            setTimeout(() => {
                setLastAnalysis(null);
                if (currentIndex < sentences.length - 1) {
                    console.log(`➡️ Moving from sentence ${currentIndex + 1} to ${currentIndex + 2}`);
                    setCurrentIndex(prev => prev + 1);
                } else {
                    console.log("🏁 All sentences complete! Showing results...");
                    setPhase('results');
                }
            }, 3000);
        } else {
            console.error("❌ Analysis returned null/undefined");
        }
    };

    if (phase === 'intro') {
        return (
            <div className="max-w-2xl mx-auto p-8 bg-white rounded-xl shadow-lg text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">Speech & Cognitive Assessment</h1>
                <p className="text-gray-600 mb-8 text-lg">
                    This test analyzes your speech patterns to detect early signs of cognitive decline.
                    You will hear a series of sentences. Please repeat them as clearly and quickly as possible.
                </p>

                <div className="bg-blue-50 p-6 rounded-lg mb-8 text-left">
                    <h3 className="font-bold text-blue-800 mb-2">Instructions:</h3>
                    <ul className="list-disc list-inside space-y-2 text-blue-700">
                        <li>Ensure you are in a quiet environment.</li>
                        <li>Allow microphone access when prompted.</li>
                        <li>Listen carefully to each sentence.</li>
                        <li>Speak immediately after the audio stops.</li>
                    </ul>
                </div>

                <button
                    onClick={handleStart}
                    disabled={isLoading}
                    className="px-8 py-4 bg-blue-600 text-white text-xl font-bold rounded-full hover:bg-blue-700 transition-transform hover:scale-105 shadow-xl"
                >
                    {isLoading ? 'Initializing...' : 'Start Assessment'}
                </button>
                {error && <p className="text-red-500 mt-4">{error}</p>}
            </div>
        );
    }

    if (phase === 'audiometry') {
        return (
            <AudiometryTest
                onComplete={handleAudiometryComplete}
                onSkip={() => setPhase('recording')}
            />
        );
    }

    if (phase === 'results' && sessionId) {
        return <SpeechResults sessionId={sessionId} onRestart={() => window.location.reload()} onComplete={onComplete} />;
    }

    return (
        <div className="max-w-3xl mx-auto p-6">
            <div className="mb-8 flex justify-between items-center text-sm text-gray-500">
                <span>Sentence {currentIndex + 1} of {sentences.length}</span>
                <span>Session: {sessionId?.slice(0, 8)}...</span>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden min-h-[500px] flex flex-col">
                {/* Progress Bar */}
                <div className="h-2 bg-gray-100 w-full">
                    <div
                        className="h-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${((currentIndex) / sentences.length) * 100}%` }}
                    />
                </div>

                <div className="p-8 flex-1 flex flex-col items-center justify-center space-y-8">
                    {!isListening && !lastAnalysis && !isLoading && (
                        <AudioPlayer
                            sentence={sentences[currentIndex]}
                            volume={currentVolume}
                            onPlaybackEnd={handlePlaybackEnd}
                            autoPlay={false}
                        />
                    )}

                    {isListening && (
                        <div className="w-full max-w-md space-y-6 animate-in fade-in zoom-in duration-300">
                            <ReactionTimer
                                startTime={playbackEndedTime}
                                isRunning={isListening}
                            />
                            <AudioRecorder
                                onRecordingComplete={handleRecordingComplete}
                                maxDuration={10}
                                autoStart={true}
                            />
                        </div>
                    )}

                    {isLoading && !isListening && (
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-gray-600 font-medium">Analyzing speech patterns...</p>
                            <p className="text-sm text-gray-400 mt-2">Extracting acoustic & linguistic features</p>
                        </div>
                    )}

                    {lastAnalysis && (
                        <div className="w-full bg-green-50 border border-green-200 rounded-lg p-6 text-center animate-in slide-in-from-bottom duration-500">
                            <div className="text-4xl mb-2">✅</div>
                            <h3 className="text-xl font-bold text-green-800 mb-2">Analysis Complete</h3>
                            <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                                <div className="bg-white p-2 rounded shadow-sm">
                                    <div className="text-gray-500">Accuracy</div>
                                    <div className="font-bold text-green-600">{lastAnalysis.word_accuracy.toFixed(0)}%</div>
                                </div>
                                <div className="bg-white p-2 rounded shadow-sm">
                                    <div className="text-gray-500">Pauses</div>
                                    <div className="font-bold text-blue-600">{lastAnalysis.avg_pause_duration.toFixed(2)}s</div>
                                </div>
                                <div className="bg-white p-2 rounded shadow-sm">
                                    <div className="text-gray-500">Speed</div>
                                    <div className="font-bold text-purple-600">{lastAnalysis.speech_rate_wpm.toFixed(0)} wpm</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SpeechTest;
