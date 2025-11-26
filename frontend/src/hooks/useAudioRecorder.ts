import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderReturn {
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<Blob>;
    isRecording: boolean;
    recordingDuration: number;
    audioLevel: number;
    error: string | null;
}

export const useAudioRecorder = (): UseAudioRecorderReturn => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [audioLevel, setAudioLevel] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const startTime = useRef<number>(0);
    const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const audioContext = useRef<AudioContext | null>(null);
    const analyser = useRef<AnalyserNode | null>(null);
    const source = useRef<MediaStreamAudioSourceNode | null>(null);
    const animationFrame = useRef<number | null>(null);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };

            mediaRecorder.current.start();
            startTime.current = Date.now();
            setIsRecording(true);
            setError(null);

            // Timer
            timerInterval.current = setInterval(() => {
                setRecordingDuration((Date.now() - startTime.current) / 1000);
            }, 100);

            // Audio Level Visualization
            audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            analyser.current = audioContext.current.createAnalyser();
            source.current = audioContext.current.createMediaStreamSource(stream);
            source.current.connect(analyser.current);
            analyser.current.fftSize = 256;

            const bufferLength = analyser.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const updateLevel = () => {
                if (!analyser.current) return;
                analyser.current.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / bufferLength;
                setAudioLevel(average / 255); // Normalize 0-1
                animationFrame.current = requestAnimationFrame(updateLevel);
            };
            updateLevel();

        } catch (err: any) {
            setError(err.message || "Could not start recording");
            console.error(err);
        }
    }, []);

    const stopRecording = useCallback((): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            if (!mediaRecorder.current) {
                reject("No recorder");
                return;
            }

            mediaRecorder.current.onstop = () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });

                // Cleanup
                if (timerInterval.current) clearInterval(timerInterval.current);
                if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
                if (audioContext.current) audioContext.current.close();

                mediaRecorder.current?.stream.getTracks().forEach(track => track.stop());

                setIsRecording(false);
                setRecordingDuration(0);
                setAudioLevel(0);

                resolve(audioBlob);
            };

            mediaRecorder.current.stop();
        });
    }, []);

    return {
        startRecording,
        stopRecording,
        isRecording,
        recordingDuration,
        audioLevel,
        error
    };
};
