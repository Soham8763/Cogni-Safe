import React, { useEffect, useRef } from 'react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';

interface AudioRecorderProps {
    onRecordingComplete: (audioBlob: Blob, duration: number) => void;
    maxDuration?: number;
    autoStart?: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
    onRecordingComplete,
    maxDuration = 10,
    autoStart = false
}) => {
    const {
        startRecording,
        stopRecording,
        isRecording,
        recordingDuration,
        audioLevel,
        error
    } = useAudioRecorder();

    const hasAutoStartedRef = useRef(false);

    useEffect(() => {
        if (autoStart && !hasAutoStartedRef.current) {
            hasAutoStartedRef.current = true;
            startRecording();
        }
    }, []); // Empty dependency array - only run once on mount

    useEffect(() => {
        if (isRecording && recordingDuration >= maxDuration) {
            handleStop();
        }
    }, [recordingDuration, isRecording, maxDuration]);

    const handleStop = async () => {
        const blob = await stopRecording();
        onRecordingComplete(blob, recordingDuration);
    };

    return (
        <div className="flex flex-col items-center p-6 bg-white border-2 border-dashed border-gray-300 rounded-xl">
            {error && <p className="text-red-500 mb-4">{error}</p>}

            <div className="relative mb-6">
                <div
                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 ${
                        isRecording ? 'bg-red-100' : 'bg-gray-100'
                    }`}
                    style={{
                        transform: isRecording ? `scale(${1 + audioLevel * 0.5})` : 'scale(1)'
                    }}
                >
                    <div className={`w-12 h-12 rounded-full ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-gray-400'}`}></div>
                </div>
            </div>

            <div className="text-center mb-6">
                <p className={`text-lg font-semibold ${isRecording ? 'text-red-600' : 'text-gray-600'}`}>
                    {isRecording ? 'Recording...' : 'Waiting to record'}
                </p>
                <p className="text-2xl font-mono mt-2">
                    {recordingDuration.toFixed(1)}s <span className="text-gray-400 text-sm">/ {maxDuration}s</span>
                </p>
            </div>

            {!isRecording ? (
                <button
                    onClick={startRecording}
                    className="px-8 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                    Start Recording
                </button>
            ) : (
                <button
                    onClick={handleStop}
                    className="px-8 py-3 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900 transition-colors"
                >
                    Stop Recording
                </button>
            )}
        </div>
    );
};

export default AudioRecorder;
